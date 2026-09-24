export async function saveFile(data:Uint8Array|string,name:string,mime:string):Promise<void> {
  const blob=new Blob([typeof data==='string'?data:new Uint8Array(data)],{type:mime});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
