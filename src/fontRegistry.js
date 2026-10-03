import { parseTrueTypeFont } from './ttfOutline.js';
let activeFont=null;
export function loadUserTtf(buffer,name='Uploaded TTF'){activeFont=parseTrueTypeFont(buffer,name);return activeFont}
export function getUserTtf(){return activeFont}
export function clearUserTtf(){activeFont=null}
export function userTtfInfo(){return activeFont?{name:activeFont.name,unitsPerEm:activeFont.unitsPerEm,numGlyphs:activeFont.numGlyphs}:null}
