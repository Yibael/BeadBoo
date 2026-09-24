// Keep full-chart PNG allocations bounded on iOS. SVG retains readable vector labels.
export const MAX_PNG_SIDE = 4096;
export const MAX_PNG_PIXELS = 12_000_000;
export function pngLayout(width: number, height: number, colors: number) {
  for(let cell=28;cell>=1;cell--) {
    const w=Math.max(640,width*cell+72,Math.ceil(colors/64)*190+48),columns=Math.max(3,Math.floor((w-48)/190));
    const h=height*cell+72+90+Math.ceil(colors/columns)*28;
    if(w<=MAX_PNG_SIDE&&h<=MAX_PNG_SIDE&&w*h<=MAX_PNG_PIXELS) return { cell, width:w, height:h, columns };
  }
  throw new Error('画布过大，请导出 SVG 或当前区域。');
}
