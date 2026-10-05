import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { defaultsForTemplate, generateGeometry } from '../src/geometry.js';
import { dielineDocumentFromGeometryV38, dielineDocumentFromStateV38, setEdgeCurveV38 } from '../src/dielineCadV38.js';
import { buildDielineSvgV38, buildDxfV38, buildDielinePdfV38 } from '../src/productionExportV38.js';
import { buildStructuralTopologyV39 } from '../src/structuralTopologyEngineV39.js';
import { buildProductionPdfV43 } from '../src/productionPdfV43.js';
import { runPreflightV44 } from '../src/preflightV44.js';
import { splitEdgeV44, mergeSplitNodeV44, canMergeSplitNodeV44, setNodeContinuityV44, continuityDiagnosticsV44, curveLengthV44 } from '../src/curveEditingV44.js';

const state=structuredClone(defaultState);
state.structure={...defaultsForTemplate('fefco-0427'),flapTaper:8,notch:6,shoulder:10,relief:4,cornerRadius:8};
const geo=generateGeometry(state.structure),doc=dielineDocumentFromGeometryV38(geo),cubic=doc.edges.find(e=>e.lineType==='CUT'&&e.curve==='cubic');
assert.ok(cubic,'V0.44 fixture requires native cubic CUT geometry');
const original=structuredClone(cubic),split=splitEdgeV44(doc,cubic.id,.37);
assert.equal(split.curve,'cubic');assert.equal(split.doc.edges.length,doc.edges.length+1);assert.equal(split.doc.nodes.length,doc.nodes.length+1);
assert.ok(split.doc.edges.filter(e=>split.edgeIds.includes(e.id)).every(e=>e.curve==='cubic'));
assert.equal(canMergeSplitNodeV44(split.doc,split.nodeId).ok,true,'fresh cubic split must be losslessly mergeable');
const merged=mergeSplitNodeV44(split.doc,split.nodeId),restored=merged.doc.edges.find(e=>e.id===merged.edgeId);
assert.deepEqual(restored,original,'lossless cubic merge must restore the exact source edge record');
assert.equal(merged.doc.nodes.length,doc.nodes.length);assert.equal(merged.doc.edges.length,doc.edges.length);

const editedSplit=structuredClone(split.doc),editedChild=editedSplit.edges.find(e=>e.id===split.edgeIds[0]);editedChild.c1.x+=.25;
const blocked=canMergeSplitNodeV44(editedSplit,split.nodeId);assert.equal(blocked.ok,false);assert.equal(blocked.code,'V44_MERGE_GEOMETRY_CHANGED','edited curve split must refuse fake lossless merge');

const arcSource=structuredClone(doc),line=arcSource.edges.find(e=>e.lineType==='CUT'&&e.curve==='line');assert.ok(line,'arc fixture requires CUT line');
let arcDoc=setEdgeCurveV38(arcSource,line.id,'arc',{rx:18,ry:18,rotation:0,largeArc:false,sweep:true}),arcSplit=splitEdgeV44(arcDoc,line.id,.43);
assert.equal(arcSplit.curve,'arc');assert.ok(arcSplit.doc.edges.filter(e=>arcSplit.edgeIds.includes(e.id)).every(e=>e.curve==='arc'));
assert.equal(canMergeSplitNodeV44(arcSplit.doc,arcSplit.nodeId).ok,true,'native arc split must be reversible');
assert.match(buildDielineSvgV38(arcSplit.doc),/\sA\s/,'split arcs must remain SVG A commands');
assert.match(buildDxfV38(arcSplit.doc),/\nARC\n/,'split circular arcs must remain DXF ARC entities');
const arcPdfText=new TextDecoder().decode(buildDielinePdfV38(arcSplit.doc));assert.match(arcPdfText,/\sc\s/,'split arcs must remain vector curves in PDF');
const arcMerged=mergeSplitNodeV44(arcSplit.doc,arcSplit.nodeId);assert.equal(arcMerged.doc.edges.find(e=>e.id===arcMerged.edgeId).curve,'arc');

const continuityDoc={schema:'boxstudio-dieline-v38',version:1,width:40,height:30,template:'continuity',nodes:[{id:'a',x:0,y:0},{id:'m',x:10,y:0},{id:'b',x:20,y:0}],edges:[{id:'e1',a:'a',b:'m',lineType:'CUT',curve:'cubic',c1:{x:3,y:3},c2:{x:8,y:2}},{id:'e2',a:'m',b:'b',lineType:'CUT',curve:'cubic',c1:{x:12,y:-1},c2:{x:17,y:-3}}],panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}};
const g1=setNodeContinuityV44(continuityDoc,'m','g1',{driverEdgeId:'e1'}),g1d=continuityDiagnosticsV44(g1,'m');assert.ok(g1d.tangentErrorDeg<1e-4,'G1 must align tangent direction');
const c1=setNodeContinuityV44(continuityDoc,'m','c1',{driverEdgeId:'e1'}),c1d=continuityDiagnosticsV44(c1,'m');assert.ok(c1d.tangentErrorDeg<1e-3);assert.ok(Math.abs(c1d.speedRatio-1)<1e-6,'C1 must match first derivative magnitude');
const g2=setNodeContinuityV44(continuityDoc,'m','g2',{driverEdgeId:'e1'}),g2d=continuityDiagnosticsV44(g2,'m');assert.ok(g2d.tangentErrorDeg<1e-4);assert.ok(g2d.curvatureDelta<1e-5,'G2 must match signed curvature');
assert.ok(curveLengthV44(continuityDoc,'e1')>10,'curve length must exceed the chord for this bowed cubic');

const splitSvg=buildDielineSvgV38(split.doc),splitDxf=buildDxfV38(split.doc),splitPdfText=new TextDecoder().decode(buildDielinePdfV38(split.doc));assert.match(splitSvg,/data-curve="cubic"/);assert.match(splitDxf,/\nSPLINE\n/);assert.match(splitPdfText,/\sc\s/);
const topology=buildStructuralTopologyV39(state,{doc:split.doc,curveSteps:24,tolerance:.01,minArea:.1});assert.ok(topology.stats.faces>0,'split native curves must still rebuild production topology');
const preflight=runPreflightV44(state,{doc:split.doc});assert.equal(preflight.schema,'boxstudio-preflight-v44');assert.ok(preflight.checks.some(x=>x.code==='V44_SPLIT_REVERSIBLE'&&x.severity==='pass'));assert.equal(preflight.summary.splitNodes,1);assert.equal(preflight.summary.mergeableSplitNodes,1);

// Final Production PDF uses a production-safe baseline fixture so this serializer assertion is isolated
// from the existing FEFCO 0427 panel-identity review gate. The structure is still a real split cubic.
const productionState=structuredClone(defaultState),productionDoc=dielineDocumentFromStateV38(productionState),productionLine=productionDoc.edges.find(e=>e.lineType==='CUT'&&e.curve==='line');
assert.ok(productionLine,'production fixture requires a CUT line');
const productionNodes=new Map(productionDoc.nodes.map(x=>[x.id,x])),pa=productionNodes.get(productionLine.a),pb=productionNodes.get(productionLine.b),pc1={x:pa.x+(pb.x-pa.x)/3,y:pa.y+(pb.y-pa.y)/3},pc2={x:pa.x+2*(pb.x-pa.x)/3,y:pa.y+2*(pb.y-pa.y)/3};
const productionCurved=setEdgeCurveV38(productionDoc,productionLine.id,'cubic',{c1:pc1,c2:pc2}),productionSplit=splitEdgeV44(productionCurved,productionLine.id,.5);
assert.equal(canMergeSplitNodeV44(productionSplit.doc,productionSplit.nodeId).ok,true,'production split cubic must retain reversible provenance');
const finalPdf=buildProductionPdfV43(productionState,{doc:productionSplit.doc}),finalText=new TextDecoder().decode(finalPdf);assert.ok(finalPdf.length>1000);assert.match(finalText,/\/CutContour/);assert.match(finalText,/\sc\s/,'full Production PDF must keep split cubic structural curves native');

console.log(`BoxStudio V0.44 curve topology passed: split=${split.curve} arc=${arcSplit.curve} faces=${topology.stats.faces} G1=${g1d.tangentErrorDeg.toFixed(6)}deg G2=${g2d.curvatureDelta.toExponential(2)} productionPdf=${finalPdf.length}`);