import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decode,encode} from 'fast-png';
import {fromByteArray} from 'base64-js';
import {decodeRaster,patternPNG} from '../src/lib/png';
import {createPattern} from '../src/lib/pattern';
import cat from '../src/lib/cat-sample';
const options={width:32,maxColors:12,dithering:false,cleanup:false,removeBackground:false};
test('bundled sample PNG decodes without Canvas or native modules',()=>{
 const raster=decodeRaster(cat);assert.equal(raster.width,192);assert.equal(raster.height,192);assert.equal(raster.data.length,192*192*4);
 const p=createPattern(raster,options);assert.equal(p.total,1024);assert(p.counts.filter(Boolean).length<=12);
});
test('PNG decode preserves transparent RGBA pixels',()=>{
 const bytes=encode({width:2,height:1,channels:4,depth:8,data:new Uint8Array([255,0,0,0,0,255,0,255])});
 const raster=decodeRaster(fromByteArray(bytes));assert.equal(raster.data[3],0);assert.equal(raster.data[7],255);
});
test('export creates a decodable PNG with all chart rows and a legend',()=>{
 const p=createPattern(decodeRaster(cat),options),bytes=patternPNG(p),img=decode(bytes);
 assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(img.width,32*28+72);assert(img.height>32*28+72);assert.equal(img.channels,4);
 const left=(img.width-32*28)/2,index=((36+3)*img.width+left+3)*4;
 const hex=p.palette[p.cells[0]].hex;
 assert.equal(img.data[index],parseInt(hex.slice(1,3),16));
 assert.deepEqual(bytes,patternPNG(p));
});
