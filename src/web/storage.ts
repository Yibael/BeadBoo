export interface AsyncStoragePort { read(slot:0|1):Promise<string|null>; write(slot:0|1,value:string,expectedRevision?:number):Promise<void> }
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('浏览器不支持本地存储，请换用 Safari 或 Chrome。'));return;}
    const request=indexedDB.open('bead-studio-web',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined;};resolve(db);};
    request.onerror=()=>{database=undefined;reject(new Error('本地数据暂时无法读取，请检查浏览器设置。'));};
    request.onblocked=()=>{database=undefined;reject(new Error('请关闭其他豆豆工坊页面后重试。'));};
  });
}
export function browserStorage(namespace:string):AsyncStoragePort {
  return {
    async read(slot){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly');const r=tx.objectStore('snapshots').get(`${namespace}-${slot}`);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);});},
    async write(slot,value,expectedRevision){const db=await openDatabase();await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');let conflict=false;
      const requests=[store.get(`${namespace}-0`),store.get(`${namespace}-1`)];let pending=2;
      for(const r of requests)r.onsuccess=()=>{if(--pending)return;const latest=Math.max(0,...requests.map(q=>{try{return JSON.parse(q.result)?.revision??0;}catch{return 0;}}));
        if(expectedRevision!==undefined&&latest>expectedRevision){conflict=true;tx.abort();}else store.put(value,`${namespace}-${slot}`);
      };
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(new Error(conflict?'另一个页面已更新数据。请取消本次操作并刷新，再继续。':'保存失败，请检查设备空间后重试。'));
    });},
  };
}
// A committed UI state is published only after the IndexedDB transaction completes.
export class AsyncRepository<T> {
  private revision=0;private ready=false;items:T[]=[];
  constructor(private storage:AsyncStoragePort,private validate:(data:unknown)=>T[]){}
  async load(){const raw=await Promise.all([this.storage.read(0),this.storage.read(1)]);const valid:{revision:number;items:T[]}[]=[];let recovered=false;
    for(const value of raw){if(value===null)continue;try{const s=JSON.parse(value);if(s.schema!==1||!Number.isSafeInteger(s.revision)||s.revision<1)throw new Error();valid.push({revision:s.revision,items:this.validate(s.items)});}catch{recovered=true;}}
    if(recovered&&!valid.length)throw new Error('本地记录无法读取，原始数据已保留。请重试或导入备份。');
    const s=valid.sort((a,b)=>b.revision-a.revision)[0];this.revision=s?.revision??0;this.items=s?.items??[];this.ready=true;return{items:this.items,recovered};
  }
  async commit(items:T[]){if(!this.ready)throw new Error('请先读取本地数据');this.validate(items);const revision=this.revision+1;await this.storage.write(revision%2 as 0|1,JSON.stringify({schema:1,revision,items}),this.revision);this.items=items;this.revision=revision;return items;}
}
