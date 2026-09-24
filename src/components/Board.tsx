import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import Svg,{Path,Text as SvgText} from 'react-native-svg';
import {Pattern,rgb} from '../lib/pattern';
export type Region={x:number;y:number;width:number;height:number};
export function Board({pattern,region,beads=true,codes=false,highlight,onCell}:{pattern:Pattern;region?:Region;beads?:boolean;codes?:boolean;highlight?:number;onCell?:(index:number)=>void}) {
 const r=region??{x:0,y:0,width:pattern.width,height:pattern.height};
 const cell=20,pad=18,w=r.width*cell+pad*2,h=r.height*cell+pad*2;
 const [layoutWidth,setLayoutWidth]=useState(1);
 const {paths,labels,lines}=useMemo(()=>{
  const paths=pattern.palette.map(()=>''),labels:{x:number;y:number;code:string;light:boolean}[]=[];
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
   const i=pattern.cells[(r.y+y)*pattern.width+r.x+x];if(i<0)continue;
   const px=pad+x*cell,py=pad+y*cell;
   if(beads){const cx=px+10,cy=py+10;paths[i]+=`M${cx-9},${cy}a9,9 0 1,0 18,0a9,9 0 1,0 -18,0zM${cx-2.5},${cy}a2.5,2.5 0 1,0 5,0a2.5,2.5 0 1,0 -5,0z`;}
   else paths[i]+=`M${px},${py}h20v20h-20z`;
   if(codes){const c=rgb(pattern.palette[i].hex);labels.push({x:px+10,y:py+12,code:pattern.palette[i].code,light:c[0]*.299+c[1]*.587+c[2]*.114<155});}
  }
  let lines='';if(!beads){for(let x=0;x<=r.width;x++)lines+=`M${pad+x*cell},${pad}v${r.height*cell}`;for(let y=0;y<=r.height;y++)lines+=`M${pad},${pad+y*cell}h${r.width*cell}`;}
  return {paths,labels,lines};
 },[pattern,r.x,r.y,r.width,r.height,beads,codes]);
 return <View onLayout={e=>setLayoutWidth(e.nativeEvent.layout.width)} style={{width:'100%',aspectRatio:w/h,backgroundColor:'#faf9f4',borderRadius:8,overflow:'hidden'}}>
  <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} pointerEvents="none">
   {paths.map((d,i)=>d?<Path key={i} d={d} fill={pattern.palette[i].hex} fillRule="evenodd" opacity={highlight!==undefined&&highlight!==i?.13:1}/>:null)}
   {lines?<Path d={lines} stroke="#6d786b" strokeOpacity={.3} strokeWidth={.6}/>:null}
   {labels.map((l,i)=><SvgText key={i} x={l.x} y={l.y} fill={l.light?'#fff':'#26342b'} textAnchor="middle" fontSize={l.code.length>4?4:5.7} fontFamily="monospace">{l.code}</SvgText>)}
   {Array.from({length:r.width},(_,x)=>x===0||(r.x+x+1)%5===0?<SvgText key={`x${x}`} x={pad+x*cell+10} y={11} textAnchor="middle" fontSize={6} fill="#919b88">{r.x+x+1}</SvgText>:null)}
   {Array.from({length:r.height},(_,y)=>y===0||(r.y+y+1)%5===0?<SvgText key={`y${y}`} x={9} y={pad+y*cell+12} textAnchor="middle" fontSize={6} fill="#919b88">{r.y+y+1}</SvgText>:null)}
  </Svg>
  {onCell&&<Pressable accessibilityLabel="图纸编辑画布" style={StyleSheet.absoluteFill} onPress={e=>{
   const x=Math.floor((e.nativeEvent.locationX/layoutWidth*w-pad)/cell),y=Math.floor((e.nativeEvent.locationY/layoutWidth*w-pad)/cell);
   if(x>=0&&x<r.width&&y>=0&&y<r.height)onCell((r.y+y)*pattern.width+r.x+x);
  }}/>}
 </View>;
}
