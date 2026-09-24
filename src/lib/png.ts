import './text-decoder';
import { pngLayout } from './export-layout';
import { decode, encode } from 'fast-png';
import { toByteArray } from 'base64-js';
import { Pattern, Raster, rgb } from './pattern';

export function decodeRaster(base64: string): Raster {
  const png = decode(toByteArray(base64));
  if (png.depth !== 8 || ![1,2,3,4].includes(png.channels)) throw new Error('无法读取图片的颜色格式');
  const data = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i=0; i<png.width*png.height; i++) {
    const s=i*png.channels, d=i*4;
    if (png.channels<3) {
      data[d]=data[d+1]=data[d+2]=png.data[s];
      data[d+3]=png.channels===2 ? png.data[s+1] : 255;
    } else {
      data[d]=png.data[s]; data[d+1]=png.data[s+1]; data[d+2]=png.data[s+2];
      data[d+3]=png.channels===4 ? png.data[s+3] : 255;
    }
  }
  return {width:png.width,height:png.height,data};
}

// Tiny bitmap typeface keeps PNG export identical on iOS, Android and web.
const glyphs:Record<string,string[]> = {
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],
 '3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
 '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],
 '9':['111','101','111','001','111'],'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],
 'C':['111','100','100','100','111'],'D':['110','101','101','101','110'],'E':['111','100','110','100','111'],
 'F':['111','100','110','100','100'],'G':['111','100','101','101','111'],'H':['101','101','111','101','101'],
 'I':['111','010','010','010','111'],'J':['001','001','001','101','111'],'K':['101','101','110','101','101'],
 'L':['100','100','100','100','111'],'M':['10001','11011','10101','10001','10001'],'N':['1001','1101','1011','1001','1001'],
 'O':['111','101','101','101','111'],'P':['111','101','111','100','100'],'Q':['111','101','101','111','001'],
 'R':['110','101','110','101','101'],'S':['111','100','111','001','111'],'T':['111','010','010','010','010'],
 'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],'W':['10001','10001','10101','11011','10001'],
 'X':['101','101','010','101','101'],'Y':['101','101','010','010','010'],'Z':['111','001','010','100','111'],
 '-':['000','000','111','000','000'],'_':['000','000','000','000','111'],'/':['001','001','010','100','100'],
 ':':['0','1','0','1','0'],' ':['00','00','00','00','00']
};

export function patternPNG(p:Pattern):Uint8Array {
  const margin=36, used=p.counts.map((count,index)=>({count,index})).filter(c=>c.count);
  const {cell,width,height,columns}=pngLayout(p.width,p.height,used.length);
  const data=new Uint8Array(width*height*4).fill(255);
  const rect=(x:number,y:number,w:number,h:number,c:number[])=>{
    for(let yy=Math.max(0,y); yy<Math.min(height,y+h); yy++) for(let xx=Math.max(0,x);xx<Math.min(width,x+w);xx++){
      const i=(yy*width+xx)*4;data[i]=c[0];data[i+1]=c[1];data[i+2]=c[2];
    }
  };
  const text=(s:string,x:number,y:number,c:number[],scale=1)=>{
    for(const ch of s.toUpperCase()){
      const g=glyphs[ch]??glyphs[' '];
      g.forEach((line,row)=>[...line].forEach((bit,col)=>{if(bit==='1')rect(x+col*scale,y+row*scale,scale,scale,c);}));
      x+=(g[0].length+1)*scale;
    }
  };
  const left=Math.floor((width-p.width*cell)/2),top=margin,dark=[52,62,54];
  p.cells.forEach((index,i)=>{
    const x=left+(i%p.width)*cell,y=top+Math.floor(i/p.width)*cell;
    if(index<0){rect(x,y,cell,cell,[243,245,240]);return;}
    const c=rgb(p.palette[index].hex);rect(x,y,cell,cell,c);
    const code=p.palette[index].code.toUpperCase();
    const len=[...code].reduce((n,ch)=>n+(glyphs[ch]?.[0].length??2)+1,0)-1;
    const scale=len*2<=cell-4?2:1;
    if(cell>=14 && len<=cell-2)text(code,x+Math.floor((cell-len*scale)/2),y+Math.floor((cell-5*scale)/2),c[0]*.299+c[1]*.587+c[2]*.114>155?dark:[255,255,255],scale);
  });
  for(let x=0;x<=p.width;x++)rect(left+x*cell,top,1,p.height*cell,x%10===0?[119,129,115]:[186,193,181]);
  for(let y=0;y<=p.height;y++)rect(left,top+y*cell,p.width*cell,1,y%10===0?[119,129,115]:[186,193,181]);
  for(let x=0;x<p.width;x++)if(x===0||(x+1)%10===0)text(String(x+1),left+x*cell+7,top-18,dark);
  for(let y=0;y<p.height;y++)if(y===0||(y+1)%10===0)text(String(y+1),left-25,top+y*cell+10,dark);
  const start=top+p.height*cell+26;
  text(`BEAD STUDIO / ${p.width} X ${p.height} / ${p.total} BEADS`,24,start,dark,2);
  const info=p.colorCard;
  const identity=info ? `${info.id} / V${info.revision}` : 'D CODES ARE DEMO COLORS';
  text(identity.slice(0,70),24,start+24,[130,138,125]);
  used.forEach(({count,index},j)=>{
    const x=24+(j%columns)*Math.floor((width-48)/columns),y=start+52+Math.floor(j/columns)*28;
    rect(x,y,16,16,rgb(p.palette[index].hex));text(`${p.palette[index].code} X ${count}`,x+24,y+4,dark,2);
  });
  return encode({width,height,data,channels:4,depth:8});
}
