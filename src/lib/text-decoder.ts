// Expo/Hermes provides UTF-8 decoding; fast-png also decodes Latin-1 metadata.
// Keep the native decoder for UTF-8 and add only the missing single-byte encoding.
const windows1252=[8364,129,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,141,381,143,144,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,157,382,376];
export function compatibleTextDecoder(Base:typeof TextDecoder):typeof TextDecoder {
 return class extends Base {
  private readonly singleByte:boolean;
  constructor(label='utf-8',options?:TextDecoderOptions){
   const single=['latin1','iso-8859-1','windows-1252'].includes(label.trim().toLowerCase());
   super(single?'utf-8':label,options);this.singleByte=single;
  }
  get encoding(){return this.singleByte?'windows-1252':super.encoding;}
  decode(...args:Parameters<TextDecoder['decode']>):string {
   if(!this.singleByte)return super.decode(...args);
   const input=args[0];if(!input)return '';
   const bytes=ArrayBuffer.isView(input)?new Uint8Array(input.buffer,input.byteOffset,input.byteLength):new Uint8Array(input);
   let result='';for(const n of bytes)result+=String.fromCharCode(n>=128&&n<=159?windows1252[n-128]:n);
   return result;
  }
 };
}
try { new TextDecoder('latin1'); }
catch { globalThis.TextDecoder=compatibleTextDecoder(globalThis.TextDecoder); }
