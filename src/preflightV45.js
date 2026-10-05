import { runPreflightV44 } from './preflightV44.js';
import { validateV45ConstraintState } from './curveConstraintsV45.js';

const check=(severity,code,title,detail,entityId=null)=>({severity,code,title,detail,entityId});

export function runPreflightV45(state,{doc=null,tolerance=.01,tangentToleranceDeg=.05,c1SpeedTolerance=.002,g2CurvatureTolerance=1e-5}={}){
  const base=runPreflightV44(state,{doc,tolerance,tangentToleranceDeg,speedTolerance:c1SpeedTolerance,curvatureTolerance:Math.max(g2CurvatureTolerance,1e-5)}),dieline=base.dieline,checks=[...base.checks];
  const constrained=validateV45ConstraintState(dieline,{tangentToleranceDeg,c1SpeedTolerance,g2CurvatureTolerance});
  for(const issue of constrained.issues)checks.push(check(issue.severity,issue.code,'V0.45 live curve constraint',issue.detail,issue.entityId));
  const corners=(dieline.edges||[]).filter(e=>e.v45Corner),fillets=corners.filter(e=>e.v45Corner.mode==='fillet'),chamfers=corners.filter(e=>e.v45Corner.mode==='chamfer');
  if(corners.length)checks.push(check('pass','V45_CORNER_OPERATIONS_NATIVE','Fillet / Chamfer topology',`${fillets.length} native fillet Arc(s) and ${chamfers.length} native chamfer Line(s) remain in the production dieline.`));
  else checks.push(check('pass','V45_CORNER_ENGINE_READY','Fillet / Chamfer topology','Native Fillet/Chamfer engine is available; this document has no V0.45 corner operations.'));
  if(!constrained.issues.length)checks.push(check('pass','V45_LIVE_CONSTRAINTS_VALID','Live continuity constraints','All stored G1/C1/G2 constraints satisfy V0.45 tolerances.'));
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v45',ok:errors.length===0,errors,warnings,passes,checks,v45:{corners:corners.length,fillets:fillets.length,chamfers:chamfers.length,constraintIssues:constrained.issues.length},summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,v45Corners:corners.length,v45Fillets:fillets.length,v45Chamfers:chamfers.length}};
}

export function productionGateV45(state,options={}){const report=runPreflightV45(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
