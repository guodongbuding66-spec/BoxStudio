import { buildBatchState } from './batchTemplates.js';
import { runPreflight } from './preflight.js';
import { buildProductionPdf } from './export.js';
import { safeBatchFileName } from './batch.js';
import { materializeSvgMarksForProduction, validateSvgMark } from './svgMark.js';

export function workerBatchEligibility(state={},assets={}){
  const blockers=[],options=state.exportOptions||{},hasTtf=Boolean(assets?.hasTtf||assets?.ttf?.bytes),hasIcc=Boolean(assets?.hasIcc||assets?.icc?.bytes);
  if(options.outlineText&&options.fontMode==='ttf'&&!hasTtf)blockers.push('TTF outline mode requires the uploaded TTF binary to be transferred into the PDF worker.');
  if(String(options.pdfxMode||'off')!=='off'&&!hasIcc)blockers.push('PDF/X candidate mode requires the loaded ICC binary to be transferred into the PDF worker.');
  return{ok:blockers.length===0,blockers,requires:{ttf:Boolean(options.outlineText&&options.fontMode==='ttf'),icc:String(options.pdfxMode||'off')!=='off'}};
}

function svgMarkErrors(state){
  const errors=[];for(const element of state?.elements||[]){if(element?.type!=='svg-symbol')continue;const check=validateSvgMark(element.svgMark);if(!check.ok)errors.push(...check.errors.map(message=>`SVG mark ${element.id||''}: ${message}`));}
  return errors;
}

export function buildWorkerPdfTask(baseState,row,index=0,{assets={}}={}){
  const eligibility=workerBatchEligibility(baseState,assets);if(!eligibility.ok)return{ok:false,index,error:eligibility.blockers.join(' '),errors:eligibility.blockers};
  try{
    const page=buildBatchState(baseState,row),svgErrors=svgMarkErrors(page),checks=runPreflight(page),preflightErrors=checks.filter(check=>check.severity==='error').map(check=>check.title||check.detail||check.code||'Preflight error'),errors=[...svgErrors,...preflightErrors];
    if(errors.length)return{ok:false,index,error:errors.join('; '),errors};
    const productionState=materializeSvgMarksForProduction(page),bytes=buildProductionPdf(productionState),fileName=safeBatchFileName(page.variables,index,'pdf');
    return{ok:true,index,fileName,bytes,byteLength:bytes.byteLength,fingerprint:`${page.variables?.sku||''}:${page.variables?.crn||''}:${index}`,warningCount:checks.filter(check=>check.severity==='warning').length,workerAssets:{ttf:Boolean(assets?.hasTtf||assets?.ttf?.bytes),icc:Boolean(assets?.hasIcc||assets?.icc?.bytes)}};
  }catch(error){return{ok:false,index,error:error?.message||String(error),errors:[error?.message||String(error)]};}
}
