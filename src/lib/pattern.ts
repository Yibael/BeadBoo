import { gridDimensions, type ImageFit } from './dimensions';
import type { ColorCardInfo } from './color-cards';
export type Color = { code: string; name: string; hex: string };
export type Raster = { width: number; height: number; data: Uint8ClampedArray };
export const MAX_PALETTE_COLORS = 512;
export type Options = { width: number; height?: number; fit?: ImageFit; maxColors: number; dithering: boolean; cleanup: boolean; removeBackground: boolean };
export type Pattern = { width: number; height: number; cells: number[]; palette: Color[]; counts: number[]; total: number; colorCard?: ColorCardInfo };
type Vec = [number, number, number];
const swatches = [
  ["奶油白","#fff8e7"],["雪白","#ffffff"],["燕麦","#ddcbb1"],["浅灰","#c9cbd0"],["石灰","#8e939d"],["炭黑","#30343c"],
  ["鹅黄","#ffe59b"],["柠檬","#f5d543"],["蜜橙","#f7ac42"],["橘红","#e7753d"],["朱红","#d84b42"],["酒红","#923c48"],
  ["樱粉","#f8d5d0"],["桃粉","#f0a9b3"],["玫瑰","#d66e98"],["浅紫","#c6b8dc"],["丁香","#9b87bd"],["葡萄","#67527f"],
  ["雾蓝","#d2e5ee"],["天蓝","#8cc5dd"],["湖蓝","#529bbf"],["靛蓝","#426a9a"],["深蓝","#2e4667"],["薄荷","#c4dfcf"],
  ["鼠尾草","#9dbfa4"],["草绿","#79a77b"],["森林","#497860"],["墨绿","#315346"],["浅棕","#c7976b"],["焦糖","#a36d47"],
  ["可可","#78513e"],["深棕","#513c33"],["青绿","#78c7bc"],["松石","#43968e"],["肤色","#efbd99"],["珊瑚","#ec917b"]
];
export const DEMO_PALETTE: Color[] = swatches.map(([name,hex],i)=>({code:`D${String(i+1).padStart(2,"0")}`, name, hex}));
export function rgb(hex: string): Vec { return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]; }
export function oklab([r,g,b]: Vec): Vec {
  const linear = (c:number)=> { c/=255; return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4; };
  r=linear(r);g=linear(g);b=linear(b);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
}
const distance=(a:Vec,b:Vec)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
function nearest(v:Vec, labs:Vec[], allowed:number[]):number { let best=allowed[0],d=Infinity;for(const i of allowed){const n=distance(v,labs[i]);if(n<d){d=n;best=i;}}return best; }
export const gridSize = gridDimensions;
// Exact area integration over decoded input pixels; partial transparency composites on white.
export function sampleRaster(image:Raster,width:number,height:number): (Vec|null)[] {
  const out:(Vec|null)[]=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const x0=x*image.width/width,x1=(x+1)*image.width/width,y0=y*image.height/height,y1=(y+1)*image.height/height;
    let r=0,g=0,b=0,alpha=0;
    for(let iy=Math.floor(y0);iy<Math.ceil(y1);iy++)for(let ix=Math.floor(x0);ix<Math.ceil(x1);ix++){
      const weight=(Math.min(x1,ix+1)-Math.max(x0,ix))*(Math.min(y1,iy+1)-Math.max(y0,iy));
      const p=(iy*image.width+ix)*4,a=image.data[p+3]/255;alpha+=a*weight;
      r+=(image.data[p]*a+255*(1-a))*weight;g+=(image.data[p+1]*a+255*(1-a))*weight;b+=(image.data[p+2]*a+255*(1-a))*weight;
    }
    const area=(x1-x0)*(y1-y0);out.push(alpha/area<.15?null:[r/area,g/area,b/area]);
  }return out;
}
// Map each target cell back to source pixels. Empty margins remain transparent.
export function sampleFittedRaster(image:Raster,width:number,height:number,fit:ImageFit): (Vec|null)[] {
  const scale=(fit==='cover'?Math.max:Math.min)(width/image.width,height/image.height);
  const offsetX=(width-image.width*scale)/2,offsetY=(height-image.height*scale)/2,out:(Vec|null)[]=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const x0=(x-offsetX)/scale,x1=(x+1-offsetX)/scale,y0=(y-offsetY)/scale,y1=(y+1-offsetY)/scale;
    const area=(x1-x0)*(y1-y0);let r=0,g=0,b=0,alpha=0,covered=0;
    for(let iy=Math.max(0,Math.floor(y0));iy<Math.min(image.height,Math.ceil(y1));iy++)for(let ix=Math.max(0,Math.floor(x0));ix<Math.min(image.width,Math.ceil(x1));ix++){
      const weight=(Math.min(x1,ix+1)-Math.max(x0,ix))*(Math.min(y1,iy+1)-Math.max(y0,iy));
      const p=(iy*image.width+ix)*4,a=image.data[p+3]/255;alpha+=a*weight;covered+=weight;
      r+=(image.data[p]*a+255*(1-a))*weight;g+=(image.data[p+1]*a+255*(1-a))*weight;b+=(image.data[p+2]*a+255*(1-a))*weight;
    }
    const blank=255*(area-covered);out.push(alpha/area<.15?null:[(r+blank)/area,(g+blank)/area,(b+blank)/area]);
  }return out;
}
// Only near-white pixels connected to the border are removed; enclosed white detail survives.
function removeWhiteBorder(pixels:(Vec|null)[],w:number,h:number){
  const queue:number[]=[],seen=new Uint8Array(pixels.length);
  const add=(i:number)=>{if(i<0||i>=pixels.length||seen[i])return;seen[i]=1;const p=pixels[i];if(!p||Math.min(...p)>235){pixels[i]=null;queue.push(i);}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  for(let q=0;q<queue.length;q++){const i=queue[q],x=i%w; if(x>0)add(i-1);if(x<w-1)add(i+1);add(i-w);add(i+w);}
}
export function createPattern(image:Raster,options:Options,palette:Color[]=DEMO_PALETTE):Pattern {
  if(!palette.length||!Number.isInteger(image.width)||image.width<1||!Number.isInteger(image.height)||image.height<1||image.data.length!==image.width*image.height*4)throw new Error("图片或色卡数据无效");
  if(!Number.isFinite(options.width)||options.width<1||!Number.isFinite(options.maxColors)||options.maxColors<1)throw new Error("网格尺寸和颜色数量必须为正数");
  if(options.fit !== undefined && !['contain','cover'].includes(options.fit))throw new Error('图片适配方式无效');
  const {width,height}=gridSize(image.width,image.height,options.width,options.height),pixels=options.height===undefined?sampleRaster(image,width,height):sampleFittedRaster(image,width,height,options.fit??'contain');
  if(options.removeBackground)removeWhiteBorder(pixels,width,height);
  const labs=palette.map(c=>oklab(rgb(c.hex))),all=palette.map((_,i)=>i),hist=new Map<number,number>();
  for(const p of pixels)if(p){const n=nearest(oklab(p),labs,all);hist.set(n,(hist.get(n)||0)+1);}
  const candidates=[...hist.keys()].sort((a,b)=>a-b),limit=Math.min(Math.floor(options.maxColors),candidates.length);
  // Greedy weighted facility selection minimizes perceptual error against the source histogram.
  const selected:number[]=limit===candidates.length?[...candidates]:[];const best=candidates.map(()=>Infinity);
  while(selected.length<limit){let winner=-1,score=Infinity;
    for(const c of candidates){if(selected.includes(c))continue;let error=0;for(let j=0;j<candidates.length;j++)error+=(hist.get(candidates[j])||0)*Math.min(best[j],distance(labs[c],labs[candidates[j]]));if(error<score){score=error;winner=c;}}
    selected.push(winner);for(let j=0;j<candidates.length;j++)best[j]=Math.min(best[j],distance(labs[winner],labs[candidates[j]]));
  }
  selected.sort((a,b)=>a-b);const cells=new Array<number>(pixels.length).fill(-1),errors=new Float64Array(pixels.length*3);
  for(let i=0;i<pixels.length;i++){
    const p=pixels[i];if(!p)continue;
    const adjusted=p.map((v,k)=>Math.max(0,Math.min(255,v+(options.dithering?errors[i*3+k]:0)))) as Vec;
    const c=nearest(oklab(adjusted),labs,selected);cells[i]=c;
    if(options.dithering){const color=rgb(palette[c].hex),x=i%width,y=Math.floor(i/width);
      for(const [dx,dy,f] of [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]]){
        const nx=x+dx,ny=y+dy,j=ny*width+nx;if(nx<0||nx>=width||ny>=height||!pixels[j])continue;
        for(let k=0;k<3;k++)errors[j*3+k]+=(adjusted[k]-color[k])*f;
      }
    }
  }
  if(options.cleanup){const original=[...cells];for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x;if(original[i]<0)continue;const neighbors=[original[i-1],original[i+1],original[i-width],original[i+width]];
    if(neighbors.every(c=>c>=0&&c===neighbors[0])&&neighbors[0]!==original[i])cells[i]=neighbors[0];
  }}
  const counts=palette.map(()=>0);for(const c of cells)if(c>=0)counts[c]++;
  return {width,height,cells,palette,counts,total:counts.reduce((a,b)=>a+b,0)};
}
export function parsePalette(value:unknown):Color[]{
  if(!Array.isArray(value)||!value.length||value.length>MAX_PALETTE_COLORS)throw new Error("色卡需包含 1–512 个颜色");
  const codes=new Set<string>();return value.map(c=>{if(!c||typeof c.code!=="string"||!/^[A-Za-z0-9_-]{1,8}$/.test(c.code)||typeof c.hex!=="string"||!/^#[0-9a-f]{6}$/i.test(c.hex)||typeof c.name!=="string"||c.name.length>40)throw new Error("请检查色号、颜色名称和参考颜色。色号限 1–8 位字母、数字、下划线或短横线，参考颜色需为 #RRGGBB 格式。");if(codes.has(c.code))throw new Error("色号不可重复");codes.add(c.code);return {code:c.code,name:c.name,hex:c.hex};});
}
export function toCSV(pattern:Pattern){
  const quote=(s:string)=>`"${(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')}"`;
  const info=pattern.colorCard;
  const identity=info?[info.name,info.brand,info.series,info.size,String(info.revision)]:['基础 36 色（历史示例）','','','',''];
  return "\uFEFF色号,名称,颜色,数量,色卡,品牌,系列,尺寸,色卡版本\r\n"+pattern.palette.map((c,i)=>pattern.counts[i]?`${quote(c.code)},${quote(c.name)},${quote(c.hex)},${pattern.counts[i]},${identity.map(quote).join(',')}`:"").filter(Boolean).join("\r\n");
}

export type CellEdit={index:number;color:number};
export function applyEdits(base:Pattern,edits:CellEdit[]):Pattern {
  if(!edits.length)return base;const cells=[...base.cells];
  for(const e of edits){if(!Number.isInteger(e.index)||e.index<0||e.index>=cells.length||!Number.isInteger(e.color)||e.color < -1||e.color>=base.palette.length)throw new Error("无效的格子编辑");cells[e.index]=e.color;}
  const counts=base.palette.map(()=>0);for(const c of cells)if(c>=0)counts[c]++;
  return {...base,cells,counts,total:counts.reduce((a,b)=>a+b,0)};
}
