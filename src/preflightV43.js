import { generateGeometry } from './geometry.js';
import { dielineDocumentFromGeometryV38 } from './dielineCadV38.js';
import { runPreflightV38 } from './preflightV38.js';
import { curveDiagnosticsV43, svgArcCenterV43 } from './curvedGeometryV43.js';

const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const check=(severity,code,title,detail,entityId=null)=>({severity,code,title,detail,entityId});
const supported=new Set(['fefco-0427','reverse-tuck-end','auto-lock-bottom']);

function edgeCurveChecks(doc){const out=[],nodes=new Map((doc?.nodes||[]).map(x=>[x.id,x]));for(const edge of doc?.edges||[]){if(edge.curve==='line'||!edge.curve)continue;const a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b)continue;if(edge.curve==='cubic'){const vals=[edge.c1?.x,edge.c1?.y,edge.c2?.x,edge.c2?.y];if(!vals.every(Number.isFinite))out.push(check('error','V43_CUBIC_HANDLE_INVALID','Native cubic geometry',`${edge.id} has invalid cubic handles.`,edge.id));else if(Math.hypot(edge.c1.x-a.x,edge.c1.y-a.y)<1e-7&&Math.hypot(edge.c2.x-b.x,edge.c2.y-b.y)<1e-7)out.push(check('warning','V43_CUBIC_NEAR_LINEAR','Native cubic geometry',`${edge.id} is cubic but both handles collapse onto its endpoints.`,edge.id))}else if(edge.curve==='arc'){const raw={type:'A',x1:a.x,y1:a.y,...edge.arc,largeArc:edge.arc?.largeArc?1:0,sweep:edge.arc?.sweep?1:0,x2:b.x,y2:b.y};if(!svgArcCenterV43(raw))out.push(check('error','V43_ARC_INVALID','Native arc geometry',`${edge.id} cannot resolve to a valid SVG/DXF arc.`,edge.id))}else out.push(check('error','V43_CURVE_KIND_UNSUPPORTED','Native curve geometry',`${edge.id} uses unsupported curve kind ${edge.curve}.`,edge.id))}return out}

export function runPreflightV43(state,{doc=null,tolerance=.01,requireNativeCurves=true}={}){
  const geo=generateGeometry(state?.structure||{}),dieline=doc||dielineDocumentFromGeometryV38(geo),base=runPreflightV38(state,{doc:dieline,tolerance}),checks=[...base.checks],structure=state?.structure||{},radius=Math.max(0,n(structure.cornerRadius)),nativeEdges=(dieline.edges||[]).filter(e=>e.curve==='cubic'||e.curve==='arc');
  checks.push(...edgeCurveChecks(dieline));
  const allCurves=[...(geo.cutCurves||[]),...(geo.creaseCurves||[]),...(geo.perfCurves||[]),...(geo.glueCurves||[])],diag=curveDiagnosticsV43(allCurves);
  if(diag.invalid)checks.push(check('error','V43_CURVE_RECORD_INVALID','Curve record validation',`${diag.invalid} geometry curve record${diag.invalid===1?' is':'s are'} invalid.`));
  else checks.push(check('pass','V43_CURVE_RECORDS_VALID','Curve record validation',`${diag.cubic} cubic + ${diag.arc} arc geometry records validated.`));
  if(requireNativeCurves&&radius>0&&supported.has(structure.template)){
    const mode=geo.advancedV43?.cornerRadiusMode;if(mode!=='production-native-cubic'||!(geo.cutCurves||[]).length)checks.push(check('error','V43_RADIUS_NOT_NATIVE','Corner radius production geometry',`Requested ${radius} mm corner radius did not produce native CUT curves.`));else checks.push(check('pass','V43_RADIUS_NATIVE','Corner radius production geometry',`${geo.advancedV43.curvesAdded} native cubic CUT fillets generated for ${radius} mm radius.`));
  }
  if(nativeEdges.length)checks.push(check('pass','V43_DIELINE_NATIVE_CURVES','Dieline curve preservation',`${nativeEdges.length} native curve edge${nativeEdges.length===1?'':'s'} preserved in the CAD document.`));
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');return{schema:'boxstudio-preflight-v43',ok:errors.length===0,errors,warnings,passes,checks,dieline,geometry:geo,curveDiagnostics:diag,nativeEdges:nativeEdges.length,summary:{errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,nativeEdges:nativeEdges.length}};
}

export function productionGateV43(state,options={}){const report=runPreflightV43(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
