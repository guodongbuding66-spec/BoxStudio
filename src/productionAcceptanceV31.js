import { buildProductionPdfV27, productionPdfV27Diagnostics } from './productionPdfV27.js';
import { runV31Acceptance, assertV31Acceptance } from './acceptanceV31.js';

export function buildAcceptedProductionPdfV31(state,options={}){
  const bytes=buildProductionPdfV27(state);
  const report=runV31Acceptance(state,bytes,{toleranceMm:.2,pxPerMm:10,...options});
  assertV31Acceptance(report);
  return {bytes,report};
}
export function productionPdfV31Diagnostics(state,options={}){
  const {bytes,report}=buildAcceptedProductionPdfV31(state,options);
  return {...productionPdfV27Diagnostics(state),serializer:'v0.31-accepted-native-cubic-production',requiredAcceptance:true,acceptance:report,byteLength:bytes.length};
}
export function v31ProductionGate(state,options={}){
  try{const {bytes,report}=buildAcceptedProductionPdfV31(state,options);return {ok:true,stage:'accepted',reason:report.summary,bytes,report};}
  catch(error){return {ok:false,stage:'acceptance',reason:String(error?.message||error),error};}
}
