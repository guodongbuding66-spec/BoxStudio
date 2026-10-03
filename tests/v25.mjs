import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { parseSvgMark } from '../src/svgMark.js';
import { createCrossPanelArtwork, crossPanelClipPolygon, materializeCrossPanelArtworkElement } from '../src/crossPanelArtwork.js';
import { generateGeometry } from '../src/geometry.js';
import { crossClipNodes, ensureBezierClipState, setClipNodeHandlePresetV25, moveClipHandleV25, insertClipNodeV25, removeClipNodeV25, flattenCrossClipNormalized, clipPathDiagnosticsV25 } from '../src/clipPathV25.js';
import { smartAlignmentDeltaV25, smartSizeMatchV25 } from '../src/smartGuidesV25.js';
import { parseRgbCmykDeviceLink, createDeviceLinkTransform, loadRgbCmykDeviceLink, clearRgbCmykDeviceLink, getDeviceLinkInfo } from '../src/iccDeviceLinkV23.js';
import { currentDeviceLinkReference } from '../src/productionPdfV24.js';
import { buildProductionPdfV25, productionPdfV25Diagnostics } from '../src/productionPdfV25.js';

function putAscii(bytes,at,text){for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i)}
function putU16(bytes,at,v){bytes[at]=(v>>>8)&255;bytes[at+1]=v&255}
function putU32(bytes,at,v){bytes[at]=(v>>>24)&255;bytes[at+1]=(v>>>16)&255;bytes[at+2]=(v>>>8)&255;bytes[at+3]=v&255}
function putFixed(bytes,at,v){putU32(bytes,at,Math.round(v*65536)>>>0)}
function syntheticLut16(){const tagOff=160,inputEntries=2,outputEntries=2,grid=2,tagSize=52+3*inputEntries*2+(grid**3)*4*2+4*outputEntries*2,total=tagOff+tagSize,b=new Uint8Array(total);putU32(b,0,total);putAscii(b,12,'link');putAscii(b,16,'RGB ');putAscii(b,20,'CMYK');putAscii(b,36,'acsp');putU32(b,128,1);putAscii(b,132,'A2B0');putU32(b,136,tagOff);putU32(b,140,tagSize);putAscii(b,tagOff,'mft2');b[tagOff+8]=3;b[tagOff+9]=4;b[tagOff+10]=grid;[1,0,0,0,1,0,0,0,1].forEach((v,i)=>putFixed(b,tagOff+12+i*4,v));putU16(b,tagOff+48,inputEntries);putU16(b,tagOff+50,outputEntries);let at=tagOff+52;for(let c=0;c<3;c++){putU16(b,at,0);putU16(b,at+2,65535);at+=4;}for(let r=0;r<2;r++)for(let g=0;g<2;g++)for(let blue=0;blue<2;blue++){for(const v of [1-r,1-g,1-blue,0]){putU16(b,at,Math.round(v*65535));at+=2;}}for(let c=0;c<4;c++){putU16(b,at,0);putU16(b,at+2,65535);at+=4;}return b;}

const lut16=syntheticLut16(),profile=parseRgbCmykDeviceLink(lut16,'synthetic-16.icc');
assert.equal(profile.tagType,'mft2');assert.equal(profile.precision,16);assert.equal(profile.inputTableEntries,2);assert.equal(profile.outputTableEntries,2);
const transform=createDeviceLinkTransform(profile),red=transform([1,0,0]);assert.ok(Math.abs(red[0])<1e-5&&Math.abs(red[1]-1)<1e-5&&Math.abs(red[2]-1)<1e-5&&Math.abs(red[3])<1e-5,'LUT16 transform should interpolate the 16-bit CLUT');
loadRgbCmykDeviceLink(lut16,'synthetic-16.icc');const info=getDeviceLinkInfo(),ref=currentDeviceLinkReference();assert.equal(info.precision,16);assert.equal(ref.tagType,'mft2');assert.equal(ref.precision,16);assert.equal(ref.fingerprint,info.fingerprint);
clearRgbCmykDeviceLink();

const mark=parseSvgMark('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="100" fill="#222"/></svg>',{name:'clip-v25'}),state=structuredClone(defaultState),geo=generateGeometry(state.structure),front=geo.panelMap.front,cross=createCrossPanelArtwork(mark,{id:'clip-v25',x:front.x+20,y:front.y+20,width:180,height:100});state.elements.push(cross);let edited=ensureBezierClipState(state,cross.id,{inset:.08});assert.equal(crossClipNodes(edited.elements.find(e=>e.id===cross.id)).length,4);
edited=setClipNodeHandlePresetV25(edited,cross.id,0,{length:.14,angleDeg:25});let nodes=crossClipNodes(edited.elements.find(e=>e.id===cross.id));assert.equal(nodes[0].smooth,true);assert.ok(Math.hypot(...nodes[0].out)>.1);assert.ok(flattenCrossClipNormalized(edited.elements.find(e=>e.id===cross.id)).length>4);
edited=moveClipHandleV25(edited,cross.id,0,'out',front.x+110,front.y+10,{mirror:true});nodes=crossClipNodes(edited.elements.find(e=>e.id===cross.id));assert.ok(Math.abs(nodes[0].in[0]+nodes[0].out[0])<1e-9&&Math.abs(nodes[0].in[1]+nodes[0].out[1])<1e-9,'mirrored handles should stay symmetric');
edited=insertClipNodeV25(edited,cross.id,0,.5);assert.equal(crossClipNodes(edited.elements.find(e=>e.id===cross.id)).length,5);assert.ok(clipPathDiagnosticsV25(edited.elements.find(e=>e.id===cross.id)).curvedNodes>=2);const clipPoly=crossPanelClipPolygon(edited.elements.find(e=>e.id===cross.id));assert.ok(clipPoly.length>5,'Bezier clip should flatten to a production polygon');const fragments=materializeCrossPanelArtworkElement(edited.elements.find(e=>e.id===cross.id),geo);assert.ok(fragments.length>0,'Bezier clip must feed production materialization');edited=removeClipNodeV25(edited,cross.id,1);assert.equal(crossClipNodes(edited.elements.find(e=>e.id===cross.id)).length,4);

const guideState={elements:[{id:'target',type:'cross-panel-artwork',x:0,y:0,w:20,h:20},{id:'move',type:'cross-panel-artwork',x:22,y:40,w:49,h:25},{id:'size',type:'cross-panel-artwork',x:120,y:80,w:50,h:30}]};const align=smartAlignmentDeltaV25(guideState,['move'],0,0,{enabled:true,toleranceMm:3});assert.equal(align.dx,-2);assert.ok(align.guides.some(g=>g.kind==='object-align'&&g.axis==='x'));const size=smartSizeMatchV25(guideState,'move',49,29,{enabled:true,toleranceMm:2,lockAspect:false});assert.equal(size.width,50);assert.equal(size.height,30);assert.ok(size.guides.length>=2);

const pdf=buildProductionPdfV25(defaultState),diag=productionPdfV25Diagnostics(defaultState);assert.ok(pdf instanceof Uint8Array&&new TextDecoder().decode(pdf.slice(0,40)).startsWith('%PDF-1.7'));assert.equal(diag.serializer,'v0.25-native-production');
console.log('BoxStudio V0.25 tests passed');
