import { parseTrueTypeFont } from './ttfOutline.js';
let activeFont=null,activeSource=null;
function toBytes(buffer){if(buffer instanceof Uint8Array)return new Uint8Array(buffer);if(buffer instanceof ArrayBuffer)return new Uint8Array(buffer.slice(0));if(ArrayBuffer.isView(buffer))return new Uint8Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));throw new Error('TTF source must be an ArrayBuffer or TypedArray');}
export function loadUserTtf(buffer,name='Uploaded TTF'){const bytes=toBytes(buffer);activeFont=parseTrueTypeFont(bytes,name);activeSource={name,bytes};return activeFont}
export function getUserTtf(){return activeFont}
export function getUserTtfSource(){return activeSource?{name:activeSource.name,bytes:new Uint8Array(activeSource.bytes)}:null}
export function clearUserTtf(){activeFont=null;activeSource=null}
export function userTtfInfo(){return activeFont?{name:activeFont.name,unitsPerEm:activeFont.unitsPerEm,numGlyphs:activeFont.numGlyphs,sourceBytes:activeSource?.bytes?.byteLength||0}:null}
