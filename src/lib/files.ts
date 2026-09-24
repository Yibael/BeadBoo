import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function saveFile(data:Uint8Array|string,name:string,mime:string):Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('此设备暂不支持文件分享');
  const file=new File(Paths.cache,name);
  file.create({overwrite:true});
  file.write(data);
  await Sharing.shareAsync(file.uri,{mimeType:mime,dialogTitle:'保存或分享拼豆图纸'});
}
