import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { buildDielineSvgV38, buildDxfV38, buildDielinePdfV38 } from '../src/productionExportV38.js';
import { setNodeContinuityV44, continuityDiagnosticsV44 } from '../src/curveEditingV44.js';
import { applyLiveContinuityV45, setCubicHandleLengthV45, setCircularArcRadiusV45, curveDimensionDiagnosticsV45, cornerOperationEligibilityV45, applyCornerOperationV45, validateV45ConstraintState } from '../src/curveConstraintsV45.js';
import { runPreflightV45 } from '../src/preflightV45.js';

const continuityDoc={schema:'boxstudio-dieline-v38',version:1,width:40,height:30,template:'v45-continuity',nodes:[{id:'a',x:0,y:0},{id:'m',x:10,y:0},{id:'b',x:20,y:0}],edges:[{id:'e1',a:'a',b:'m',lineType:'CUT',curve:'cubic',c1:{x:3,y:4},c2:{x:8,y:2}},{id:'e2',a:'m',b:'b',lineType:'CUT',curve:'cubic',c1:{x:12,y:-1},c2:{x:17,y:-3}}],panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}};
let constrained=setNodeContinuityV44(continuityDoc,'m','g2',{driverEdgeId:'e1'}),broken=structuredClone(constrained),driver=broken.edges.find(e=>e.id==='e1');driver.c2={x:7.25,y:3.5};driver.c1={x:2.6,y:5.1};
assert.ok(continuityDiagnosticsV44(broken,'m').tangentErrorDeg>.1,'fixture must break the stored G2 relation before live solve');
const live=applyLiveContinuityV45(broken,'e1'),liveDiag=continuityDiagnosticsV44(live.doc,'m');assert.equal(live.applied.length,1);assert.equal(live.applied[0].driverEdgeId,'e1');assert.ok(liveDiag.tangentErrorDeg<1e-4,'live solve must restore tangent continuity');assert.ok(liveDiag.curvatureDelta<1e-5,'live solve must restore G2 curvature');

const handleDoc=setCubicHandleLengthV45(live.doc,'e1','c1',6.25),handleDims=curveDimensionDiagnosticsV45(handleDoc,'e1');assert.ok(Math.abs(handleDims.c1Length-6.25)<1e-5,'Cubic handle-length constraint must be exact in mm');assert.ok(continuityDiagnosticsV44(handleDoc,'m').curvatureDelta<1e-5,'dimension edit must keep stored G2 constraint');

const cornerDoc={schema:'boxstudio-dieline-v38',version:1,width:30,height:30,template:'v45-corner',nodes:[{id:'n1',x:0,y:0},{id:'n2',x:20,y:0},{id:'n3',x:20,y:20},{id:'n4',x:0,y:20}],edges:[{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'e2',a:'n2',b:'n3',lineType:'CUT',curve:'line'},{id:'e3',a:'n3',b:'n4',lineType:'CUT',curve:'line'},{id:'e4',a:'n4',b:'n1',lineType:'CUT',curve:'line'}],panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}};
const eligibility=cornerOperationEligibilityV45(cornerDoc,'n1');assert.equal(eligibility.ok,true);assert.ok(Math.abs(eligibility.angleDeg-90)<1e-8);
const fillet=applyCornerOperationV45(cornerDoc,'n1',{mode:'fillet',valueMm:5}),filletEdge=fillet.doc.edges.find(e=>e.id===fillet.connectorEdgeId);assert.equal(filletEdge.curve,'arc');assert.equal(filletEdge.lineType,'CUT');assert.equal(filletEdge.arc.rx,5);assert.equal(filletEdge.arc.ry,5);assert.equal(fillet.doc.nodes.some(n=>n.id==='n1'),false,'fillet must replace the original sharp corner node');assert.equal(fillet.doc.edges.length,5,'fillet must replace one corner with a native connector while preserving trimmed sides');
const filletDims=curveDimensionDiagnosticsV45(fillet.doc,fillet.connectorEdgeId);assert.ok(Math.abs(filletDims.pathLength-Math.PI*2.5)<.02,`90° R5 fillet path should be quarter-circle; got ${filletDims.pathLength}`);assert.match(buildDielineSvgV38(fillet.doc),/\sA\s/,'Fillet must remain a native SVG Arc');assert.match(buildDxfV38(fillet.doc),/\nARC\n/,'Fillet must remain a native DXF ARC');assert.match(new TextDecoder().decode(buildDielinePdfV38(fillet.doc)),/\sc\s/,'Fillet must remain vector Cubic operators in PDF');assert.equal(validateV45ConstraintState(fillet.doc).ok,true);

const chamfer=applyCornerOperationV45(cornerDoc,'n1',{mode:'chamfer',valueMm:4}),chamferEdge=chamfer.doc.edges.find(e=>e.id===chamfer.connectorEdgeId);assert.equal(chamferEdge.curve,'line');assert.equal(chamferEdge.lineType,'CUT');assert.equal(chamferEdge.v45Corner.mode,'chamfer');

const radiusDoc=structuredClone(fillet.doc),radiusChanged=setCircularArcRadiusV45(radiusDoc,fillet.connectorEdgeId,6),radiusDims=curveDimensionDiagnosticsV45(radiusChanged,fillet.connectorEdgeId);assert.equal(radiusDims.rx,6);assert.equal(radiusDims.ry,6);assert.throws(()=>setCircularArcRadiusV45(fillet.doc,fillet.connectorEdgeId,1),error=>error?.code==='V45_RADIUS_BELOW_HALF_CHORD');

const state=structuredClone(defaultState),preflight=runPreflightV45(state,{doc:fillet.doc});assert.equal(preflight.schema,'boxstudio-preflight-v45');assert.equal(preflight.v45.fillets,1);assert.ok(preflight.checks.some(x=>x.code==='V45_CORNER_OPERATIONS_NATIVE'&&x.severity==='pass'));
const invalid=structuredClone(fillet.doc),invalidArc=invalid.edges.find(e=>e.id===fillet.connectorEdgeId);invalidArc.arc.rx=.5;invalidArc.arc.ry=.5;const invalidState=validateV45ConstraintState(invalid);assert.equal(invalidState.ok,false);assert.ok(invalidState.issues.some(x=>x.code==='V45_FILLET_RADIUS_INVALID'));

console.log(`BoxStudio V0.45 constraints passed: live=${live.applied.length} G2=${liveDiag.curvatureDelta.toExponential(2)} handle=${handleDims.c1Length.toFixed(2)} fillet=R${filletDims.rx.toFixed(1)} arc=${filletDims.pathLength.toFixed(3)} chamfer=${chamferEdge.v45Corner.valueMm.toFixed(1)}`);
