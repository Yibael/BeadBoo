import {build} from 'esbuild';
import {readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
for(const file of await readdir('public'))if(/^pattern-worker-.*\.js$/.test(file))await rm(`public/${file}`);
const bundle=await build({entryPoints:['src/web/worker.ts'],bundle:true,minify:true,write:false,platform:'browser',target:['safari16','chrome100'],format:'iife'});
const hash=createHash('sha256').update(bundle.outputFiles[0].contents).digest('hex').slice(0,12),worker=`pattern-worker-${hash}.js`;
await writeFile(`public/${worker}`,bundle.outputFiles[0].contents);await writeFile('src/web/build-info.json',JSON.stringify({worker:`/${worker}`,version:hash}));
execFileSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web'],{stdio:'inherit',env:{...process.env,CI:'1'}});
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory())files.push(...await walk(`${dir}/${e.name}`));else files.push(`${dir}/${e.name}`);}return files;}
const files=(await walk('dist')).filter(f=>!f.endsWith('.map')&&!f.endsWith('/sw.js')).map(f=>'/'+f.slice(5));
const version=createHash('sha256');for(const f of files)version.update(await readFile('dist'+f));
const cache='bead-'+version.digest('hex').slice(0,16);
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(cache)},FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE')e.waitUntil((async()=>{await self.skipWaiting();})());});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(caches.open(CACHE).then(async c=>(await c.match('/index.html'))||fetch(e.request)));return;}e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||(await caches.match(e.request))||fetch(e.request)));});`);
console.log(`PWA built: ${cache}, ${files.length} offline assets`);
