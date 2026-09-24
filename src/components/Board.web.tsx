import {useEffect,useRef} from 'react';
import type {Pattern} from '../lib/pattern';
export type Region={x:number;y:number;width:number;height:number};
export function Board({pattern,region,highlight,onCell}: {pattern:Pattern;region?:Region;beads?:boolean;codes?:boolean;highlight?:number;onCell?:(index:number)=>void}) {
 const ref=useRef<HTMLCanvasElement>(null),r=region??{x:0,y:0,width:pattern.width,height:pattern.height};
 useEffect(()=>{const c=ref.current!;const pixel=Math.max(1,Math.floor(Math.min(4,512/Math.max(r.width,r.height))));c.width=r.width*pixel;c.height=r.height*pixel;const ctx=c.getContext('2d')!;ctx.fillStyle='#faf9f4';ctx.fillRect(0,0,c.width,c.height);for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){const n=pattern.cells[(r.y+y)*pattern.width+r.x+x];if(n<0)continue;ctx.globalAlpha=highlight!==undefined&&highlight!==n?.15:1;ctx.fillStyle=pattern.palette[n].hex;ctx.fillRect(x*pixel,y*pixel,pixel,pixel);}ctx.globalAlpha=1;},[pattern,r.x,r.y,r.width,r.height,highlight]);
 return <canvas ref={ref} role="img" aria-label={`${pattern.width} 列 ${pattern.height} 行图纸预览`} style={{display:'block',width:'100%',aspectRatio:`${r.width}/${r.height}`,borderRadius:8,maxHeight:'100%',objectFit:'contain',imageRendering:'pixelated'}} onClick={e=>{if(!onCell)return;const b=e.currentTarget.getBoundingClientRect();onCell((r.y+Math.min(r.height-1,Math.floor((e.clientY-b.top)/b.height*r.height)))*pattern.width+r.x+Math.min(r.width-1,Math.floor((e.clientX-b.left)/b.width*r.width)));}}/>;
}
