import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { buildAcceptedProductionPdfV31 } from '../src/productionAcceptanceV31.js';
import { parsePdfMediaBoxV31, geometryAcceptanceV31, digitalDecodeRequiredCheckV31, runV31Acceptance } from '../src/acceptanceV31.js';

const mode=process.env.V31_BASE_PROBE||'geometry';
const state=structuredClone(defaultState);
const pdf=buildProductionPdfV27(state);

if(mode==='geometry'){
  const report=geometryAcceptanceV31(state,pdf);
  assert.equal(report.ok,true,`geometry failures: ${report.failures.map(x=>`${x.id}=${x.errorMm}`).join(', ')}`);
  assert.ok(report.maxErrorMm<=.2,'geometry tolerance');
}else if(mode==='digital'){
  const report=digitalDecodeRequiredCheckV31(state,pdf);
  assert.equal(report.ok,true,`digital failures: ${report.failures.map(x=>`${x.id}:${x.error||x.stage}`).join(' | ')}`);
  assert.equal(report.results.length,1,'visible Barcode/QR group count');
  assert.equal(report.results[0].barcodeOk,true,'barcodeOk');
  assert.equal(report.results[0].qrOk,true,'qrOk');
}else if(mode==='aggregate'){
  const report=runV31Acceptance(state,pdf);
  assert.equal(report.geometry.ok,true,'aggregate geometry');
  assert.equal(report.digital.ok,true,'aggregate digital');
  assert.equal(report.ok,true,report.summary);
}else if(mode==='accepted'){
  const out=buildAcceptedProductionPdfV31(state);
  assert.equal(out.report.ok,true,out.report.summary);
}else if(mode==='bytes'){
  const out=buildAcceptedProductionPdfV31(state);
  assert.ok(out.bytes instanceof Uint8Array,'Production PDF must be Uint8Array');
  assert.equal(new TextDecoder().decode(out.bytes.subarray(0,8)),'%PDF-1.7','PDF signature');
}else if(mode==='media'){
  const media=parsePdfMediaBoxV31(pdf);
  assert.ok(media.width>0,'MediaBox width');
  assert.ok(media.height>0,'MediaBox height');
}else{
  throw new Error(`Unknown V31_BASE_PROBE ${mode}`);
}

console.log(`V0.31 base probe ${mode} passed`);
