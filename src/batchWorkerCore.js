import { buildBatchState } from './batchTemplates.js';
import { runPreflight } from './preflight.js';
import { buildProductionPdfV19 } from './exportV19.js';
import { buildProductionPdfV24, productionPdfV24Diagnostics } from './productionPdfV24.js';
import { safeBatchFileName } from './batch.js';
import { validateSvgMark } from './svgMark.js';

export function workerBatchEligibility(state={},assets={}){
  const blockers=[],options=state.exportOptions||{},hasTtf=Boolean(assets?.hasTtf||assets?.ttf?.bytes),hasIcc=Boolean(assets?.hasIcc||assets?.icc?.bytes),hasDeviceLink=Boolean(assets?.hasDeviceLink||assets?.deviceLink?.bytes),declared=options.deviceLinkRef||null,loadedFingerprint=String(assets?.deviceLinkFingerprint||assets?.deviceLink?.fingerprint||'');
  if(options.outlineText&&options.fontMode==='ttf'&&!hasTtf)blockers.push('TTF outline mode requires the uploaded TTF binary to be transferred into the PDF worker.');
  if(String(options.pdfxMode||'off')!=='off'&&!hasIcc)blockers.push('PDF/X candidate mode requires the loaded ICC binary to be transferred into the PDF worker.');
  if(declared?.fingerprint&&!hasDeviceLink)blockers.push(`Project declares DeviceLink ${declared.name||declared.fingerprint}, but the worker has no DeviceLink binary.`);
  if(declared?.fingerprint&&hasDeviceLink&&String(declared.fingerprint)!==loadedFingerprint)blockers.push(`Worker DeviceLink fingerprint mismatch: expected ${declared.fingerprint}, got ${loadedFingerprint||'unknown'}.`);
  return{ok:blockers.length===0,blockers,requires:{ttf:Boolean(options.outlineText&&options.fontMode==='ttf'),icc:String(options.pdfxMode||'off')!=='off',deviceLink:Boolean(declared?.fingerprint)}};
}
function svgMarkErrors(state){const errors=[];for(const element of state?.elements||[]){if(!['svg-symbol','cross-panel-artwork'].includes(element?.type))continue;const check=validateSvgMark(element.svgMark);if(!check.ok)errors.push(...check.errors.map(message=>`SVG mark ${element.id||''}: ${message}`));}return errors}
function prepareTask(baseState,row,index,assets){const eligibility=workerBatchEligibility(baseState,assets);if(!eligibility.ok)return{errorResult:{ok:false,index,error:eligibility.blockers.join(' '),errors:eligibility.blockers}};const page=buildBatchState(baseState,row),svgErrors=svgMarkErrors(page),checks=runPreflight(page),preflightErrors=checks.filter(check=>check.severity==='error').map(check=>check.title||check.detail||check.code||'Preflight error'),errors=[...svgErrors,...preflightErrors];if(errors.length)return{errorResult:{ok:false,index,error:errors.join('; '),errors}};return{page,checks,fileName:safeBatchFileName(page.variables,index,'pdf')};}
export function buildWorkerPdfTask(baseState,row,index=0,{assets={}}={}){
  if(baseState?.batchPipeline==='v24-native')return buildWorkerPdfTaskV24(baseState,row,index,{assets});
  try{const prepared=prepareTask(baseState,row,index,assets);if(prepared.errorResult)return prepared.errorResult;const {page,checks,fileName}=prepared,bytes=buildProductionPdfV19(page);return{ok:true,index,fileName,bytes,byteLength:bytes.byteLength,fingerprint:`${page.variables?.sku||''}:${page.variables?.crn||''}:${index}`,warningCount:checks.filter(check=>check.severity==='warning').length,workerAssets:{ttf:Boolean(assets?.hasTtf||assets?.ttf?.bytes),icc:Boolean(assets?.hasIcc||assets?.icc?.bytes)},serializer:'v0.19-appearance'};}catch(error){return{ok:false,index,error:error?.message||String(error),errors:[error?.message||String(error)]}}
}
export function buildWorkerPdfTaskV24(baseState,row,index=0,{assets={}}={}){
  try{const prepared=prepareTask(baseState,row,index,assets);if(prepared.errorResult)return prepared.errorResult;const {page,checks,fileName}=prepared,bytes=buildProductionPdfV24(page),diag=productionPdfV24Diagnostics(page);return{ok:true,index,fileName,bytes,byteLength:bytes.byteLength,fingerprint:`${page.variables?.sku||''}:${page.variables?.crn||''}:${index}`,warningCount:checks.filter(check=>check.severity==='warning').length,workerAssets:{ttf:Boolean(assets?.hasTtf||assets?.ttf?.bytes),icc:Boolean(assets?.hasIcc||assets?.icc?.bytes),deviceLink:Boolean(assets?.hasDeviceLink||assets?.deviceLink?.bytes)},serializer:'v0.24-native-production',colorSpace:diag.colorSpace,deviceLinkFingerprint:diag.binding?.current?.fingerprint||''};}catch(error){return{ok:false,index,error:error?.message||String(error),errors:[error?.message||String(error)]}}
}
