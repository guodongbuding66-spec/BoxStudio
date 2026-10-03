import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { parseSvgMark, createSvgMarkElement } from '../src/svgMark.js';
import { createCrossPanelArtwork } from '../src/crossPanelArtwork.js';
import { buildArtworkAtlas } from '../src/panelArtwork.js';
import { buildNativeSvgV20Layer, injectNativeSvgV20 } from '../src/nativeSvgV20.js';
import { orderedElements, moveElementZ, normalizeZOrder } from '../src/objectOrder.js';
import { crossPanelOverlayItems } from '../src/v20CanvasOverlay.js';

const svg=`<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient></defs><rect x="0" y="0" width="100" height="50" fill="url(#g)"/></svg>`;
const mark=parseSvgMark(svg,{name:'V20 Native Gradient'}),state=structuredClone(defaultState),geo=generateGeometry(state.structure);
const local=createSvgMarkElement(mark,{id:'v20-local',panelId:'front',x:10,y:10,width:100});local.zIndex=2;state.elements.push(local);
const panels=Object.entries(geo.panelMap).filter(([,p])=>Number(p?.w)>30&&Number(p?.h)>30);let placement=null;
for(let i=0;i<panels.length&&!placement;i++)for(let j=i+1;j<panels.length&&!placement;j++){const [,a]=panels[i],[,b]=panels[j],tol=.01;if(Math.abs((a.x+a.w)-b.x)<tol||Math.abs((b.x+b.w)-a.x)<tol){const edge=Math.abs((a.x+a.w)-b.x)<tol?a.x+a.w:b.x+b.w,y0=Math.max(a.y,b.y),y1=Math.min(a.y+a.h,b.y+b.h);if(y1-y0>30)placement={x:edge-25,y:y0+5,w:50,h:Math.min(40,y1-y0-10)}}if(!placement&&(Math.abs((a.y+a.h)-b.y)<tol||Math.abs((b.y+b.h)-a.y)<tol)){const edge=Math.abs((a.y+a.h)-b.y)<tol?a.y+a.h:b.y+b.h,x0=Math.max(a.x,b.x),x1=Math.min(a.x+a.w,b.x+b.w);if(x1-x0>30)placement={x:x0+5,y:edge-20,w:Math.min(55,x1-x0-10),h:40}}}
assert.ok(placement,'need adjacent panels for V0.20 cross-panel test');
const cross=createCrossPanelArtwork(mark,{id:'v20-cross',...placement,zIndex:99});state.elements.push(cross);state.selectedId=cross.id;
const atlas=buildArtworkAtlas(state,geo);assert.ok(atlas.crossPanelFragments>0,'cross-panel artwork must enter panel artwork atlas');assert.ok(atlas.plans.some(p=>p.commands.some(c=>c.crossPanelSourceId==='v20-cross')),'folded texture plan should contain cross-panel fragments');
const native=buildNativeSvgV20Layer(state,geo);assert.ok(native.stats.gradients>=2);assert.equal(native.stats.crossPanelObjects,1);assert.match(native.defs,/linearGradient/);assert.match(native.body,/data-v20-source="v20-cross"/);assert.match(native.body,/clip-path=/);
const injected=injectNativeSvgV20('<svg xmlns="http://www.w3.org/2000/svg"></svg>',state,geo);assert.match(injected.svg,/boxstudio-v20-native-appearance/);assert.match(injected.svg,/native-gradients="true"/);
const normalized=normalizeZOrder(state),before=orderedElements(normalized.elements),moved=moveElementZ(normalized,cross.id,'back'),after=orderedElements(moved.elements);assert.equal(before.at(-1).id,cross.id);assert.equal(after[0].id,cross.id);assert.deepEqual(after.map(x=>x.zIndex),after.map((_,i)=>i));
const overlays=crossPanelOverlayItems(state);assert.equal(overlays.length,1);assert.equal(overlays[0].id,'v20-cross');assert.ok(overlays[0].lineCount>0);
console.log('BoxStudio V0.20 tests passed');
