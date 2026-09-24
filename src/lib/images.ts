import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decodeRaster } from './png';

export async function readImage(uri:string,width:number,height:number) {
  if(width*height>40_000_000)throw new Error('图片过大，请先缩小至 4000 万像素以内');
  const context=ImageManipulator.manipulate(uri);
  let rendered;
  try {
    if(Math.max(width,height)>768)context.resize(width>=height?{width:768}:{height:768});
    rendered=await context.renderAsync();
    const png=await rendered.saveAsync({format:SaveFormat.PNG,base64:true});
    if(!png.base64)throw new Error('未能读取图片像素');
    return decodeRaster(png.base64);
  } finally {
    rendered?.release();
    context.release();
  }
}
