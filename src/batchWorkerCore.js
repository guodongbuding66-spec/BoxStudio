import { buildBatchState } from './batchTemplates.js';
import { runPreflight } from './preflight.js';
import { buildProductionPdf } from './export.js';
import { safeBatchFileName } from './batch.js';
import { materializeSvgMarksForProduction, validateSvgMark } from './svgMark.js';

export function workerBatchEligibility(state={}){
  const blockers=[],options=state.exportOptions||{};
  if(options.outlineText&&options.fontMode==='ttf')blockers.push('User TTF outline data is session-local and is not available inside the PDF worker.');
  if(String(options.pdfxMode||'off')!=='off')blockers.push('PDF/X candidate output may depend on session-local ICC data and stays on the main-thread production path.');
  return{ok:blockers.length===0,blockers};
}

function svgMarkErrors(state){
  const errors=[];for(const element of state?.elements||[]){if(element?.type!=='svg-symbol')continue;const check=validateSvgMark(element.svgMark);if(!check.ok)errors.push(...check.errors.map(message=>`SVG mark ${element.id||''}: ${message}`));}
  return errors;
}

export function buildWorkerPdfTask(baseState,row,index=0){
  const eligibility=workerBatchEligibility(baseState);if(!eligibility.ok)return{ok:false,index,error:eligibility.blockers.join(' '),errors:eligibility.blockers};
  try{
    const page=buildBatchState(baseState,row),svgErrors=svgMarkErrors(page),checks=runPreflight(page),preflightErrors=checks.filter(check=>check.severity==='error').map(check=>check.title||check.detail||check.code||'Preflight error'),errors=[...svgErrors,...preflightErrors];
    if(errors.length)return{ok:false,index,error:errors.join('; '),errors};
    const productionState=materializeSvgMarksForProduction(page),bytes=buildProductionPdf(productionState),fileName=safeBatchFileName(page.variables,index,'pdf');
    return{ok:true,index,fileName,bytes,byteLength:bytes.byteLength,fingerprint:`${page.variables?.sku||''}:${page.variables?.crn||''}:${index}`,warningCount:checks.filter(check=>check.severity==='warning').length};
  }catch(error){return{ok:false,index,error:error?.message||String(error),errors:[error?.message||String(error)]};}
}
