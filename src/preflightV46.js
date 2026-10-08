import { runPreflightV45 } from './preflightV45.js';
import { validateV46ConstraintState } from './curveConstraintsV46.js';
import { runCadTopology3dAcceptanceV46 } from './acceptanceV46.js';

const check=(severity,code,title,detail,entityId=null)=>({severity,code,title,detail,entityId});

export function runPreflightV46(state,{doc=null,tolerance=.01,tangentToleranceDeg=.05,c1SpeedTolerance=.002,g2CurvatureTolerance=1e-5,equalRadiusTolerance=.001,include3dAcceptance=true,allowWarnings=true}={}){
  const base=runPreflightV45(state,{doc,tolerance,tangentToleranceDeg,c1SpeedTolerance,g2CurvatureTolerance}),dieline=base.dieline,checks=[...base.checks],advanced=validateV46ConstraintState(dieline,{tangentToleranceDeg,c1SpeedTolerance,g2CurvatureTolerance,equalRadiusTolerance});
  for(const x of advanced.issues.filter(x=>!base.checks.some(b=>b.code===x.code&&b.entityId===x.entityId)))checks.push(check(x.severity,x.code,'V0.46 advanced constraint',x.detail,x.entityId));
  const mixed=(dieline.nodes||[]).filter(n=>n.continuityV46?.mode==='g1'),corners=(dieline.edges||[]).filter(e=>e.v46Corner),equalGroups=dieline.constraintsV46?.equalRadiusGroups||[];
  checks.push(check('pass','V46_MIXED_CURVE_ENGINE_READY','Mixed-curve G1',`${mixed.length} stored Line/Arc/Cubic mixed-curve G1 constraint(s).`));
  checks.push(check('pass','V46_COMPOSABLE_CORNER_PROVENANCE','Composable corner features',`${corners.length} corner feature(s) use endpoint-level V0.46 provenance for independent restore/remove.`));
  checks.push(check('pass','V46_EQUAL_RADIUS_GROUPS','Equal-radius constraints',`${equalGroups.length} equal-radius Fillet group(s).`));
  let acceptance=null;
  if(include3dAcceptance){acceptance=runCadTopology3dAcceptanceV46(state,{doc:dieline,tolerance,tangentToleranceDeg,equalRadiusTolerance,allowWarnings});for(const x of acceptance.checks.filter(x=>x.code.startsWith('V46_3D_')||x.code==='V46_2D_TO_TOPOLOGY_CONSISTENT'))checks.push(check(x.severity,x.code,'2D CAD → Topology → 3D',x.detail,x.entityId||null))}
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v46',ok:errors.length===0&&(allowWarnings||warnings.length===0),errors,warnings,passes,checks,v46:{mixedConstraints:mixed.length,corners:corners.length,equalRadiusGroups:equalGroups.length,constraintIssues:advanced.issues.length,acceptance:acceptance?.summary||null},acceptance,summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,v46Mixed:mixed.length,v46Corners:corners.length,v46EqualRadiusGroups:equalGroups.length}};
}
export function productionGateV46(state,options={}){const report=runPreflightV46(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
