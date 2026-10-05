import { runPreflightV43 } from './preflightV43.js';
import { canMergeSplitNodeV44, continuityDiagnosticsV44, curveEditingDiagnosticsV44 } from './curveEditingV44.js';

const check=(severity,code,title,detail,entityId=null)=>({severity,code,title,detail,entityId});
const near=(a,b,t)=>Math.abs(Number(a)-Number(b))<=t;

export function runPreflightV44(state,{doc=null,tolerance=.01,tangentToleranceDeg=.05,speedTolerance=.002,curvatureTolerance=1e-4}={}){
  const base=runPreflightV43(state,{doc,tolerance}),dieline=base.dieline,checks=[...base.checks],diag=curveEditingDiagnosticsV44(dieline);
  for(const node of dieline.nodes||[]){
    const mode=node.continuityV44;if(!mode||mode==='corner')continue;const d=continuityDiagnosticsV44(dieline,node.id);
    if(!d.eligible){checks.push(check('error','V44_CONTINUITY_TOPOLOGY','Curve continuity',`${node.id} is marked ${mode.toUpperCase()} but is not a degree-2 cubic junction.`,node.id));continue}
    if(d.tangentErrorDeg>tangentToleranceDeg)checks.push(check('error','V44_G1_BROKEN','G1 tangent continuity',`${node.id} tangent error is ${d.tangentErrorDeg.toFixed(4)}°; expected ≤ ${tangentToleranceDeg}°.`,node.id));
    else checks.push(check('pass','V44_G1_VALID','G1 tangent continuity',`${node.id} tangent error ${d.tangentErrorDeg.toFixed(4)}°.` ,node.id));
    if(mode==='c1'&&!near(d.speedRatio,1,speedTolerance))checks.push(check('error','V44_C1_BROKEN','C1 derivative continuity',`${node.id} handle-speed ratio is ${d.speedRatio?.toFixed(6)}; expected 1 ± ${speedTolerance}.`,node.id));
    else if(mode==='c1')checks.push(check('pass','V44_C1_VALID','C1 derivative continuity',`${node.id} derivative magnitudes match.`,node.id));
    if(mode==='g2'&&d.curvatureDelta>curvatureTolerance)checks.push(check('error','V44_G2_BROKEN','G2 curvature continuity',`${node.id} curvature delta is ${d.curvatureDelta.toExponential(3)}; expected ≤ ${curvatureTolerance}.`,node.id));
    else if(mode==='g2')checks.push(check('pass','V44_G2_VALID','G2 curvature continuity',`${node.id} curvature delta ${d.curvatureDelta.toExponential(3)}.`,node.id));
  }
  for(const node of (dieline.nodes||[]).filter(x=>x.v44SplitNode)){
    const merge=canMergeSplitNodeV44(dieline,node.id,{tolerance:Math.max(.002,tolerance)});checks.push(merge.ok?check('pass','V44_SPLIT_REVERSIBLE','Reversible curve split',`${node.id} can be losslessly merged back to its source curve.`,node.id):check('warning','V44_SPLIT_EDITED','Reversible curve split',`${node.id} is no longer losslessly mergeable: ${merge.detail}`,node.id));
  }
  if(!diag.splitNodes)checks.push(check('pass','V44_SPLIT_ENGINE_READY','Curve split engine','Native line / cubic / arc splitting is available; no reversible split nodes exist in this document.'));
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v44',ok:errors.length===0,errors,warnings,passes,checks,curveEditing:diag,summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,splitNodes:diag.splitNodes,mergeableSplitNodes:diag.mergeable,continuityNodes:diag.continuityNodes}};
}

export function productionGateV44(state,options={}){const report=runPreflightV44(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
