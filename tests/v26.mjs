import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { parseSvgMark } from '../src/svgMark.js';
import { createCrossPanelArtwork } from '../src/crossPanelArtwork.js';
import { ensureBezierClipState, setClipNodeHandlePresetV25 } from '../src/clipPathV25.js';
import { clipNodeNumericV26, setClipNodeNumericV26, setClipSegmentTypeV26, clipSegmentDiagnosticsV26 } from '../src/clipPathV26.js';
import { addUserGuideV26, updateUserGuideV26, removeUserGuideV26, userGuideSnapV26, textBaselinesV26, textBaselineSnapV26, smartRotationV26 } from '../src/smartGuidesV26.js';
import { buildNativeCubicClipPdfV26, nativeCubicClipPdfDiagnosticsV26 } from '../src/nativeCubicPdfV26.js';
import { buildProductionPdfV26, productionPdfV26Diagnostics } from '../src/productionPdfV26.js';

const svg=`<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff" stop-opacity=".45"/></linearGradient></defs><rect x="0" y="0" width="100" height="60" fill="url(#g)"/></svg>`;
const mark=parseSvgMark(svg,{name:'V26 Cubic Clip'}),state=structuredClone(defaultState),geo=generateGeometry(state.structure),front=geo.panelMap.front;
let cross=createCrossPanelArtwork(mark,{id:'v26-cross',x:front.x+30,y:front.y+40,width:180,height:108,rotation:0});state.elements.push(cross);
let s=ensureBezierClipState(state,'v26-cross',{inset:.08});s=setClipNodeHandlePresetV25(s,'v26-cross',0,{length:.16,angleDeg:25});
let el=s.elements.find(e=>e.id==='v26-cross'),node=clipNodeNumericV26(el,0);assert.equal(node.segmentType,'curve');
s=setClipNodeNumericV26(s,'v26-cross',0,{x:.12,y:.18,outX:.2,outY:.08,smooth:false});el=s.elements.find(e=>e.id==='v26-cross');node=clipNodeNumericV26(el,0);assert.ok(Math.abs(node.x-.12)<1e-9&&Math.abs(node.y-.18)<1e-9);assert.ok(Math.abs(node.outX-.2)<1e-9);
s=setClipSegmentTypeV26(s,'v26-cross',0,'line');el=s.elements.find(e=>e.id==='v26-cross');assert.equal(clipNodeNumericV26(el,0).segmentType,'line');s=setClipSegmentTypeV26(s,'v26-cross',0,'curve');assert.equal(clipNodeNumericV26(s.elements.find(e=>e.id==='v26-cross'),0).segmentType,'curve');const seg=clipSegmentDiagnosticsV26(s.elements.find(e=>e.id==='v26-cross'));assert.equal(seg.nodeCount,4);assert.ok(seg.curveSegments>=1);

let guides=addUserGuideV26(s,'x',front.x+35,{label:'Trim align'});assert.equal(guides.userGuides.length,1);const gid=guides.userGuides[0].id;guides=updateUserGuideV26(guides,gid,{value:front.x+31});assert.equal(guides.userGuides[0].label,'Trim align');let snap=userGuideSnapV26(guides,['v26-cross'],0,0,{enabled:true,toleranceMm:3});assert.ok(Math.abs(snap.dx-1)<1e-9,'left edge should snap from x+30 to x+31');assert.equal(snap.guides[0].kind,'user-guide');guides=removeUserGuideV26(guides,gid);assert.equal(guides.userGuides.length,0);

const skuText=structuredClone(defaultState.elements.find(e=>e.id==='sku')),baselineState=structuredClone(defaultState);baselineState.elements=[skuText,createCrossPanelArtwork(mark,{id:'v26-baseline-cross',x:front.x+40,y:front.y+60,width:90,height:40})];const oneBaselines=textBaselinesV26(baselineState,geo);assert.equal(oneBaselines.length,1);const baseline=oneBaselines[0],movingBaseline=baselineState.elements.find(e=>e.id==='v26-baseline-cross');movingBaseline.y=baseline.value+2;const bSnap=textBaselineSnapV26(baselineState,['v26-baseline-cross'],0,0,geo,{enabled:true,toleranceMm:3});assert.ok(Math.abs(bSnap.dy+2)<1e-9,'moving top should snap to isolated text baseline');assert.equal(bSnap.guides[0].kind,'text-baseline');

const moved=structuredClone(guides),other=createCrossPanelArtwork(mark,{id:'v26-other',x:front.x+260,y:front.y+40,width:100,rotation:30});moved.elements.push(other);const rot=smartRotationV26(moved,'v26-cross',32,{enabled:true,toleranceDeg:3,step:15});assert.ok(Math.abs(rot.angle-30)<1e-9);assert.ok(rot.guides.some(g=>g.kind==='rotation-match'));

const cubicPdf=buildNativeCubicClipPdfV26(moved),cubicText=new TextDecoder().decode(cubicPdf);assert.ok(cubicText.startsWith('%PDF-1.7'));assert.ok(cubicText.includes('BoxStudio V0.26 Native Cubic Clip Proof'));assert.ok(/\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\sc/.test(cubicText),'native proof should emit PDF cubic c operators');assert.ok(cubicText.includes('W n'));const cubicDiag=nativeCubicClipPdfDiagnosticsV26(moved);assert.ok(cubicDiag.nativeClipObjects>=1);assert.ok(cubicDiag.curvedClipObjects>=1);
const production=buildProductionPdfV26(moved);assert.ok(production instanceof Uint8Array&&production.byteLength>100);assert.equal(productionPdfV26Diagnostics(moved).serializer,'v0.26-native-production');
console.log('BoxStudio V0.26 tests passed');
