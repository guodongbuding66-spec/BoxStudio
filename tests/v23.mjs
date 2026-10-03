import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { parseSvgMark, createSvgMarkElement } from '../src/svgMark.js';
import { createCrossPanelArtwork } from '../src/crossPanelArtwork.js';
import { buildProductionPdfV23, productionPdfV23Diagnostics } from '../src/productionPdfV23.js';
import { parseRgbCmykDeviceLink, createDeviceLinkTransform, loadRgbCmykDeviceLink, clearRgbCmykDeviceLink, convertRgbToCmyk } from '../src/iccDeviceLinkV23.js';
import { normalizedClipPointToDocument, documentPointToNormalizedClip, ensureCrossClip, moveCrossClipPoint } from '../src/clipEditorV23.js';
import { smartSpacingDelta } from '../src/smartSpacingV23.js';

function putAscii(bytes,at,text){for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i)}
function putU32(bytes,at,v){bytes[at]=(v>>>24)&255;bytes[at+1]=(v>>>16)&255;bytes[at+2]=(v>>>8)&255;bytes[at+3]=v&255}
function putFixed(bytes,at,v){putU32(bytes,at,Math.round(v*65536)>>>0)}
function syntheticRgbCmykLink(){const tagOff=160,tagSize=48+3*256+(2**3)*4+4*256,total=tagOff+tagSize,bytes=new Uint8Array(total);putU32(bytes,0,total);putAscii(bytes,12,'link');putAscii(bytes,16,'RGB ');putAscii(bytes,20,'CMYK');putAscii(bytes,36,'acsp');putU32(bytes,128,1);putAscii(bytes,132,'A2B0');putU32(bytes,136,tagOff);putU32(bytes,140,tagSize);putAscii(bytes,tagOff,'mft1');bytes[tagOff+8]=3;bytes[tagOff+9]=4;bytes[tagOff+10]=2;const matrix=[1,0,0,0,1,0,0,0,1];matrix.forEach((v,i)=>putFixed(bytes,tagOff+12+i*4,v));let at=tagOff+48;for(let c=0;c<3;c++)for(let i=0;i<256;i++)bytes[at++]=i;for(let r=0;r<2;r++)for(let g=0;g<2;g++)for(let b=0;b<2;b++){bytes[at++]=Math.round((1-r)*255);bytes[at++]=Math.round((1-g)*255);bytes[at++]=Math.round((1-b)*255);bytes[at++]=0;}for(let c=0;c<4;c++)for(let i=0;i<256;i++)bytes[at++]=i;return bytes;}

const alphaSvg=`<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ff0000" stop-opacity="0.15"/><stop offset="50%" stop-color="#00ff00" stop-opacity="0.65"/><stop offset="100%" stop-color="#0000ff" stop-opacity="1"/></linearGradient></defs><rect x="0" y="0" width="100" height="60" fill="url(#lg)"/></svg>`;
const state=structuredClone(defaultState),geo=generateGeometry(state.structure),front=geo.panelMap.front;
const mark=parseSvgMark(alphaSvg,{name:'V23 native alpha'}),svg=createSvgMarkElement(mark,{id:'v23-native',panelId:'front',x:20,y:190,width:180});state.elements.push(svg);
const cross=createCrossPanelArtwork(mark,{id:'v23-cross',x:front.x+front.w-60,y:front.y+230,width:130});cross.crossClip={type:'polygon',points:[[.05,.1],[.95,.1],[.85,.9],[.1,.85]]};state.elements.push(cross);
clearRgbCmykDeviceLink();
let pdf=buildProductionPdfV23(state),text=new TextDecoder().decode(pdf),diag=productionPdfV23Diagnostics(state);
assert.ok(text.startsWith('%PDF-1.7'),'V0.23 integrated production PDF should use PDF 1.7');
assert.ok(text.includes('BoxStudio V0.23 Integrated Production PDF'));
assert.ok(text.includes('/ShadingType 2'),'integrated production PDF should contain native axial shading');
assert.ok(text.includes('/SMask'),'varying gradient alpha should be integrated as an SMask');
assert.ok(text.includes('/Separation /CutContour'),'production dielines should retain spot separation resources');
assert.ok(text.includes('SKU: KF210215US-02PM-001'),'ordinary production text should coexist with native appearance');
assert.equal(diag.colorSpace,'DeviceRGB');

const linkBytes=syntheticRgbCmykLink(),profile=parseRgbCmykDeviceLink(linkBytes,'synthetic-link.icc'),transform=createDeviceLinkTransform(profile),red=transform([1,0,0]);
assert.ok(Math.abs(red[0]-0)<.01&&Math.abs(red[1]-1)<.01&&Math.abs(red[2]-1)<.01&&Math.abs(red[3])<.01,'synthetic LUT8 link should map red deterministically to 0/1/1/0 CMYK');
loadRgbCmykDeviceLink(linkBytes,'synthetic-link.icc');assert.deepEqual(convertRgbToCmyk([1,0,0]).map(x=>Math.round(x)),[0,1,1,0]);pdf=buildProductionPdfV23(state);text=new TextDecoder().decode(pdf);assert.ok(text.includes('/ColorSpace /DeviceCMYK'),'loaded verified device-link should switch native shading to DeviceCMYK');assert.equal(productionPdfV23Diagnostics(state).colorSpace,'DeviceCMYK (ICC DeviceLink LUT8)');clearRgbCmykDeviceLink();
const invalid=syntheticRgbCmykLink();putAscii(invalid,12,'prtr');assert.throws(()=>parseRgbCmykDeviceLink(invalid),/class must be link/);

let clipState=structuredClone(defaultState);clipState.elements.push({id:'clip-object',type:'cross-panel-artwork',x:40,y:60,w:120,h:70,r:33,svgMark:mark,label:'clip'});clipState=ensureCrossClip(clipState,'clip-object',{inset:.1});let el=clipState.elements.find(e=>e.id==='clip-object'),p=[.23,.77],doc=normalizedClipPointToDocument(el,p),round=documentPointToNormalizedClip(el,doc[0],doc[1]);assert.ok(Math.abs(round[0]-p[0])<1e-9&&Math.abs(round[1]-p[1])<1e-9,'rotated clip coordinate transform should round-trip');clipState=moveCrossClipPoint(clipState,'clip-object',0,doc[0],doc[1]);el=clipState.elements.find(e=>e.id==='clip-object');assert.ok(Math.abs(el.crossClip.points[0][0]-p[0])<1e-9&&Math.abs(el.crossClip.points[0][1]-p[1])<1e-9,'drag model should write normalized clip coordinates');

const spacingState={elements:[{id:'left',type:'cross-panel-artwork',x:0,y:0,w:20,h:20},{id:'move',type:'cross-panel-artwork',x:37,y:0,w:20,h:20},{id:'right',type:'cross-panel-artwork',x:80,y:0,w:20,h:20}]};const spaced=smartSpacingDelta(spacingState,['move'],0,0,{enabled:true,toleranceMm:4});assert.ok(Math.abs(spaced.dx-3)<1e-9,'smart spacing should move center object to equal 20 mm gaps');assert.ok(spaced.guides.some(g=>g.kind==='spacing'&&g.axis==='x'));

console.log('BoxStudio V0.23 tests passed');
