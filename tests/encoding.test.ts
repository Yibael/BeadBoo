import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compatibleTextDecoder} from '../src/lib/text-decoder';
test('Hermes compatibility adapter supports Latin-1 metadata and preserves UTF-8',()=>{
 class Utf8Only extends TextDecoder {constructor(label='utf-8',options?:TextDecoderOptions){if(label!=='utf-8')throw new RangeError('Unsupported');super(label,options);}}
 const Decoder=compatibleTextDecoder(Utf8Only);
 assert.equal(new Decoder('latin1').decode(new Uint8Array([65,233,128])),'Aé€');
 assert.equal(new Decoder('latin1').encoding,'windows-1252');
 assert.equal(new Decoder().decode(new TextEncoder().encode('拼豆 🧩')),'拼豆 🧩');
 assert.equal(new Decoder('latin1').decode(new DataView(new Uint8Array([65,233,66]).buffer,1,1)),'é');
});
