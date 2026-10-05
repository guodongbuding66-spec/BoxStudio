import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { defaultsForTemplate, generateGeometry } from '../src/geometry.js';
import { dielineDocumentFromGeometryV38, dielineDocumentFromStateV38, setEdgeCurveV38 } from '../src/dielineCadV38.js';
import { buildDielineSvgV38, buildDxfV38, buildDielinePdfV38 } from '../src/productionExportV38.js';
import { buildStructuralTopologyV39 } from '../src/structuralTopologyEngineV39.js';
import { runPreflightV43 } from '../src/preflightV43.js';
import { arcToCubicsV43, nativeArcForDxfV43, svgArcCenterV43 } from '../src/curvedGeometryV43.js';
import { buildProductionPdfV43, productionPdfV43Diagnostics } from '../src/productionPdfV43.js';

const state=structuredClone(defaultState);
state.structure={...defaultsForTemplate('fefco-0427'),flapTaper:8,notch:6,shoulder:10,relief:4,cornerRadius:8};
const geo=generateGeometry(state.structure);
assert.equal(geo.advancedV42.cornerRadiusMode,'metadata-only-line-engine','V0.42 compatibility contract must remain stable');
assert.equal(geo.advancedV43.cornerRadiusMode,'production-native-cubic');
assert.ok(geo.advancedV43.curvesAdded>=2,'0427 must emit native rounded CUT corners');
assert.ok((geo.cutCurves||[]).filter(c=>c.type==='C').length>=2,'corner radius must exist as cubic CUT records');
assert.ok(geo.engineeringNotes.some(x=>x.includes('V0.43 emits')));

const doc=dielineDocumentFromGeometryV38(geo);
const cubicEdges=doc.edges.filter(e=>e.lineType==='CUT'&&e.curve==='cubic');
assert.ok(cubicEdges.length>=2,'native curves must survive geometry -> Dieline CAD conversion');

const svg=buildDielineSvgV38(doc);
assert.match(svg,/data-curve-serializer="v0\.43-native"/);
assert.match(svg,/data-curve="cubic"/);
assert.match(svg,/\sC\s/,'SVG must preserve cubic path commands');

const dxf=buildDxfV38(doc);
assert.match(dxf,/BoxStudio V0\.43 native curve DXF/);
assert.match(dxf,/\nSPLINE\n/,'DXF must emit native SPLINE for cubic corners');
const flattenedDxf=buildDxfV38(doc,{curveMode:'flatten'});
assert.doesNotMatch(flattenedDxf,/\nSPLINE\n/,'explicit compatibility flatten mode may still emit LINE segments');

const pdfText=new TextDecoder().decode(buildDielinePdfV38(doc));
assert.match(pdfText,/% V0\.43 native structural curves/);
assert.match(pdfText,/\sc\s/,'Dieline PDF must use native PDF cubic operators');

const arcDoc={schema:'boxstudio-dieline-v38',version:1,width:40,height:30,template:'test',nodes:[{id:'n1',x:5,y:15},{id:'n2',x:25,y:15}],edges:[{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'arc',arc:{rx:10,ry:10,rotation:0,largeArc:false,sweep:true}}],panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}};
const arcDxf=buildDxfV38(arcDoc);
assert.match(arcDxf,/\nARC\n/,'circular CAD arcs must remain DXF ARC entities');
const rawArc={type:'A',kind:'CUT',x1:5,y1:15,rx:10,ry:10,rotation:0,largeArc:0,sweep:1,x2:25,y2:15};
assert.ok(svgArcCenterV43(rawArc));
assert.equal(arcToCubicsV43(rawArc).length,2,'180 degree arc should serialize to two <=90 degree cubics');
assert.ok(nativeArcForDxfV43(rawArc));

const topology=buildStructuralTopologyV39(state,{doc,curveSteps:24,tolerance:.01,minArea:.1});
assert.ok(topology.stats.faces>0,'3D/topology rebuild must consume sampled native curves');
assert.ok(topology.geometry.cutCurves.length>=2,'topology production geometry must retain native curve records');

const preflight=runPreflightV43(state,{doc});
assert.ok(!preflight.errors.some(x=>x.code==='V43_RADIUS_NOT_NATIVE'));
assert.ok(preflight.nativeEdges>=2);
assert.ok(preflight.checks.some(x=>x.code==='V43_RADIUS_NATIVE'&&x.severity==='pass'));

for(const template of ['reverse-tuck-end','auto-lock-bottom']){
  const g=generateGeometry({...defaultsForTemplate(template),flapTaper:4,notch:3,shoulder:5,cornerRadius:5});
  assert.equal(g.advancedV43.cornerRadiusMode,'production-native-cubic',`${template} must support production corner radius`);
  assert.ok((g.cutCurves||[]).some(c=>c.type==='C'),`${template} must emit cubic CUT curves`);
}

// Final artwork + spot-dieline Production PDF must preserve structural curves when V0.43 opts in.
const productionState=structuredClone(defaultState),productionDoc=dielineDocumentFromStateV38(productionState),lineEdge=productionDoc.edges.find(e=>e.lineType==='CUT'&&e.curve==='line');
assert.ok(lineEdge,'default production fixture needs a CUT line');const byId=new Map(productionDoc.nodes.map(n=>[n.id,n])),a=byId.get(lineEdge.a),b=byId.get(lineEdge.b),c1={x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3},c2={x:a.x+2*(b.x-a.x)/3,y:a.y+2*(b.y-a.y)/3},productionCurvedDoc=setEdgeCurveV38(productionDoc,lineEdge.id,'cubic',{c1,c2});
const finalPdf=buildProductionPdfV43(productionState,{doc:productionCurvedDoc}),finalText=new TextDecoder().decode(finalPdf),finalDiag=productionPdfV43Diagnostics(productionState,{doc:productionCurvedDoc});
assert.ok(finalPdf.length>1000);assert.match(finalText,/\/CutContour/);assert.match(finalText,/\sc\s/,'final Artwork + Dieline Production PDF must contain native cubic structural commands');assert.equal(finalDiag.ok,true);assert.equal(finalDiag.nativeStructuralCurves,true);assert.ok(finalDiag.nativeStructuralCurveObjects>=1);assert.equal(finalDiag.baseDiagnostics.nativeStructuralCurves,true);

console.log(`BoxStudio V0.43 native curves passed: cubics=${cubicEdges.length} faces=${topology.stats.faces} nativeEdges=${preflight.nativeEdges} productionPdf=${finalPdf.length}`);
