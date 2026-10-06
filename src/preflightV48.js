import { runPreflightV46 } from './preflightV46.js';
import { generateGeometry } from './geometry.js';
import { buildFoldGraph } from './foldgraph.js';
import { validateParametricStructureV48, manufacturingControlsV48 } from './parametricControlsV48.js';

const check=(severity,code,title,detail)=>({severity,code,title,detail});

export function runPreflightV48(state,{doc=null,...options}={}){
  const base=runPreflightV46(state,{doc,...options}),structure=state?.structure||{},manufacturing=validateParametricStructureV48(structure),checks=[...base.checks];
  for(const x of manufacturing.issues)checks.push(check(x.severity,x.code,'Manufacturing parameters',x.detail));
  let graph=null;
  try{
    const geo=generateGeometry(structure);graph=buildFoldGraph(geo);const expected=manufacturingControlsV48(structure),edges=graph.edges||[];
    const drift=edges.filter(e=>Math.abs(Number(e.bendRadiusMm)-expected.bend.radiusMm)>1e-6||Math.abs(Number(e.boardThicknessMm)-expected.bend.thicknessMm)>1e-6);
    if(drift.length)checks.push(check('error','V48_2D_3D_BEND_PARAMETER_DRIFT','2D/3D manufacturing consistency',`${drift.length} FoldGraph hinge(s) do not use the current board thickness / bend radius.`));
    else checks.push(check('pass','V48_2D_3D_BEND_PARAMETERS_SHARED','2D/3D manufacturing consistency',`${edges.length} FoldGraph hinge(s) use R${expected.bend.radiusMm} mm with ${expected.bend.thicknessMm} mm board.`));
  }catch(error){checks.push(check('error','V48_FOLDGRAPH_PARAMETER_CHECK_FAILED','2D/3D manufacturing consistency',error?.message||String(error)))}
  const errors=checks.filter(x=>x.severity==='error'),warnings=checks.filter(x=>x.severity==='warning'),passes=checks.filter(x=>x.severity==='pass');
  return{...base,schema:'boxstudio-preflight-v48',ok:errors.length===0,checks,errors,warnings,passes,v48:{manufacturing,graphControls:graph?.manufacturingControls||null},summary:{...base.summary,errors:errors.length,warnings:warnings.length,passes:passes.length,total:checks.length,bendRadiusMm:manufacturing.bend.radiusMm,boardThicknessMm:manufacturing.bend.thicknessMm}};
}

export function productionGateV48(state,options={}){const report=runPreflightV48(state,options);return{ok:report.ok,blocked:!report.ok,summary:report.summary,blockingCodes:[...new Set(report.errors.map(x=>x.code))],report}}
