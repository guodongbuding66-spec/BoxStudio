import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { parseSvgMark, createSvgMarkElement } from '../src/svgMark.js';
import { materializeSvgAppearanceElement } from '../src/productionAppearance.js';
import { createCrossPanelArtwork, materializeCrossPanelArtworkElement, crossPanelArtworkDiagnostics } from '../src/crossPanelArtwork.js';
import { prepareV19ProductionState, buildProductionPdfV19 } from '../src/exportV19.js';
import { buildWorkerPdfTask } from '../src/batchWorkerCore.js';

const svg=`<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient><clipPath id="c"><rect x="5" y="5" width="90" height="40"/></clipPath></defs>
<rect x="0" y="0" width="100" height="50" fill="url(#g)" clip-path="url(#c)"/>
</svg>`;
const mark=parseSvgMark(svg,{name:'V19 Gradient Mark'});
const local=createSvgMarkElement(mark,{id:'v19-local',panelId:'front',x:20,y:20,width:120});
const polys=materializeSvgAppearanceElement(local,{gradientDepth:2});
assert.ok(polys.length>8,'gradient should become multiple vector production polygons');
assert.ok(polys.every(p=>p.type==='production-polygon'));
assert.ok(new Set(polys.map(p=>p.fillColor)).size>2,'percentage gradient coordinates must create multiple colors');
assert.ok(polys.every(p=>p.points.length>=3));

const state=structuredClone(defaultState),geo=generateGeometry(state.structure);
const panels=Object.entries(geo.panelMap).filter(([,p])=>Number(p?.w)>20&&Number(p?.h)>20);
let placement=null;
for(let i=0;i<panels.length&&!placement;i++)for(let j=i+1;j<panels.length&&!placement;j++){
  const [idA,a]=panels[i],[idB,b]=panels[j],tol=.01;
  if(Math.abs((a.x+a.w)-b.x)<tol||Math.abs((b.x+b.w)-a.x)<tol){const edge=Math.abs((a.x+a.w)-b.x)<tol?a.x+a.w:b.x+b.w,y0=Math.max(a.y,b.y),y1=Math.min(a.y+a.h,b.y+b.h);if(y1-y0>30)placement={idA,idB,x:edge-30,y:y0+5,w:60,h:Math.min(45,y1-y0-10)}}
  if(!placement&&(Math.abs((a.y+a.h)-b.y)<tol||Math.abs((b.y+b.h)-a.y)<tol)){const edge=Math.abs((a.y+a.h)-b.y)<tol?a.y+a.h:b.y+b.h,x0=Math.max(a.x,b.x),x1=Math.min(a.x+a.w,b.x+b.w);if(x1-x0>30)placement={idA,idB,x:x0+5,y:edge-22,w:Math.min(60,x1-x0-10),h:44}}
}
assert.ok(placement,'default structure should contain adjacent panels for cross-panel test');
const cross=createCrossPanelArtwork(mark,{id:'v19-cross',x:placement.x,y:placement.y,width:placement.w,height:placement.h});
const fragments=materializeCrossPanelArtworkElement(cross,geo,{gradientDepth:1});
const touched=[...new Set(fragments.map(f=>f.panelId))];
assert.ok(touched.length>=2,`cross-panel artwork should clip into >=2 panels, got ${touched.join(',')}`);
assert.ok(fragments.some(f=>f.type==='production-polygon'));
assert.ok(fragments.some(f=>f.type==='line'));
state.elements.push(local,cross);
const diag=crossPanelArtworkDiagnostics(state,geo);
assert.equal(diag.count,1);
assert.ok(diag.crossPanel>=1);

const prepared=prepareV19ProductionState(state,{gradientDepth:1}).state;
assert.equal(prepared.elements.some(e=>e.type==='svg-symbol'||e.type==='cross-panel-artwork'),false);
assert.ok(prepared.elements.some(e=>e.type==='production-polygon'));
assert.ok(prepared.elements.some(e=>e.crossPanelSourceId==='v19-cross'));
const pdf=buildProductionPdfV19(state,{gradientDepth:1});
assert.ok(pdf instanceof Uint8Array);
const pdfText=new TextDecoder().decode(pdf);
assert.ok(pdfText.startsWith('%PDF-1.6'));
assert.ok(pdfText.includes('%BoxStudio V0.19'));
assert.ok(/\d\.\d{3} \d\.\d{3} \d\.\d{3} rg/.test(pdfText),'PDF should contain RGB vector fill operators');

const worker=buildWorkerPdfTask(state,{},19);
assert.equal(worker.ok,true,worker.error);
assert.equal(worker.serializer,'v0.19-appearance');
assert.ok(new TextDecoder().decode(worker.bytes.slice(0,80)).includes('BoxStudio V0.19'));
console.log('BoxStudio V0.19 tests passed');
