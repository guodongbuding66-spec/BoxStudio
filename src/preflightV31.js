import { runPreflight as runBasePreflight } from './preflight.js';
import { buildProductionPdfV27 } from './productionPdfV27.js';
import { digitalDecodeFromProductionPdfV31 } from './digitalDecodeGateV31.js';
import { geometryAcceptanceFromProductionPdfV31 } from './geometryAcceptanceV31.js';

export function runProductionAcceptanceV31(state,{toleranceMm=.2}={}){
  const pdf=buildProductionPdfV27(state),digital=digitalDecodeFromProductionPdfV31(state,pdf),geometry=geometryAcceptanceFromProductionPdfV31(state,pdf,{toleranceMm});
  return{ok:digital.ok&&geometry.ok,pdf,digital,geometry};
}

export function runPreflight(state){
  const checks=runBasePreflight(state);
  if(state?.exportOptions?.v31RequiredChecks===false){checks.push({code:'V31_REQUIRED_CHECKS_DISABLED',severity:'warning',title:'V0.31 Required Production Checks',detail:'Digital decode / Preview-PDF geometry acceptance is disabled for this project.'});return checks;}
  try{
    const a=runProductionAcceptanceV31(state,{toleranceMm:Number(state?.exportOptions?.geometryToleranceMm)||.2}),bc=a.digital.barcode,qr=a.digital.qr,g=a.geometry;
    checks.push({code:'DIGITAL_DECODE_V31',severity:a.digital.ok?'pass':'error',title:'Production PDF Barcode / QR Digital Decode',detail:a.digital.ok?`${bc.type}: ${bc.decoded||bc.expected} · QR: ${qr.decoded} · PDF vector code regions rasterized and decoded.`:`Barcode ${bc.ok?'PASS':'FAIL'}${bc.error?` (${bc.error})`:''} · QR ${qr.ok?'PASS':'FAIL'}${qr.error?` (${qr.error})`:''}. Production is blocked.`});
    checks.push({code:'PREVIEW_PDF_GEOMETRY_V31',severity:g.ok?'pass':'error',title:'Preview / PDF Geometry Acceptance',detail:g.ok?`${g.probeCount} key-point probes · max error ${g.maxErrorMm.toFixed(4)} mm · tolerance ${g.toleranceMm.toFixed(3)} mm.${g.crossPanelExcluded?` Cross-panel appearance probes excluded: ${g.crossPanelExcluded}.`:''}`:`${g.failedCount}/${g.probeCount} probes failed · max error ${Number.isFinite(g.maxErrorMm)?g.maxErrorMm.toFixed(4):'∞'} mm · tolerance ${g.toleranceMm.toFixed(3)} mm. Production is blocked.`});
  }catch(error){checks.push({code:'V31_PRODUCTION_ACCEPTANCE_ERROR',severity:'error',title:'V0.31 Production Acceptance',detail:`Required check could not complete: ${String(error?.message||error)}`});}
  return checks;
}
