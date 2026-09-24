import type { Pattern } from './pattern';
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[c]!);
export function patternSVG(pattern: Pattern) {
  const cell = 28, margin = 36, width = Math.max(640, pattern.width * cell + 72);
  const used = pattern.counts.map((n, i) => ({ n, i })).filter(c => c.n), columns = Math.max(3, Math.floor((width-72) / 190));
  const legendY = pattern.height * cell + margin + 60, height = legendY + 30 + Math.ceil(used.length / columns) * 28;
  const paths = pattern.palette.map(() => ''), labels: string[] = [];
  for (let y=0;y<pattern.height;y++) for(let x=0;x<pattern.width;x++) {
    const c=pattern.cells[y*pattern.width+x];if(c<0)continue;
    paths[c]+=`M${margin+x*cell} ${margin+y*cell}h28v28h-28z`;
    const hex=pattern.palette[c].hex,lum=parseInt(hex.slice(1,3),16)*.299+parseInt(hex.slice(3,5),16)*.587+parseInt(hex.slice(5,7),16)*.114;
    labels.push(`<text x="${margin+x*cell+14}" y="${margin+y*cell+17}" fill="${lum<155?'white':'#222'}" font-size="${pattern.palette[c].code.length>4?5:8}" text-anchor="middle">${escape(pattern.palette[c].code)}</text>`);
  }
  let grid='';for(let x=0;x<=pattern.width;x++)grid+=`M${margin+x*cell} ${margin}v${pattern.height*cell}`;for(let y=0;y<=pattern.height;y++)grid+=`M${margin} ${margin+y*cell}h${pattern.width*cell}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="monospace">${paths.map((d,i)=>d?`<path fill="${pattern.palette[i].hex}" d="${d}"/>`:'').join('')}<path d="${grid}" fill="none" stroke="#888" stroke-width=".5"/>${labels.join('')}<text x="36" y="${legendY-24}" font-size="18">${pattern.width} × ${pattern.height} · ${pattern.total} 颗 · ${escape(pattern.colorCard?.name??'拼豆图纸')}</text>${used.map(({n,i},j)=>`<rect x="${36+j%columns*190}" y="${legendY+Math.floor(j/columns)*28-14}" width="16" height="16" fill="${pattern.palette[i].hex}"/><text x="${60+j%columns*190}" y="${legendY+Math.floor(j/columns)*28}" font-size="14">${escape(pattern.palette[i].code)} × ${n}</text>`).join('')}</g></svg>`;
}
