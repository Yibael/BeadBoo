import type { Raster } from './pattern';
export async function readImage(uri: string, width: number, height: number): Promise<Raster> {
  if(width*height>40_000_000)throw new Error('图片过大，请选择 4000 万像素以内的图片。');
  const img = new Image(); img.src = uri;
  await img.decode().catch(() => { throw new Error('无法读取这张图片，请尝试 JPG、PNG 或 WebP 格式。'); });
  const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(img.naturalWidth*scale)); canvas.height = Math.max(1,Math.round(img.naturalHeight*scale));
  const context = canvas.getContext('2d', { willReadFrequently: true }); if(!context)throw new Error('当前浏览器无法读取图片。');
  context.drawImage(img,0,0,canvas.width,canvas.height); const data = context.getImageData(0,0,canvas.width,canvas.height).data;
  const result = { width: canvas.width, height: canvas.height, data }; canvas.width=canvas.height=1;return result;
}
