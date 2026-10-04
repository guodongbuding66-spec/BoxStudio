import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { buildAcceptedProductionPdfV31 } from '../src/productionAcceptanceV31.js';
import { parsePdfMediaBoxV31 } from '../src/acceptanceV31.js';

const mode=process.env.V31_BASE_PROBE||'core';
const out=buildAcceptedProductionPdfV31(structuredClone(defaultState));

if(mode==='core'){
  assert.equal(out.report.ok,true,out.report.summary);
  assert.equal(out.report.digital.ok,true,'digital gate');
  assert.equal(out.report.geometry.ok,true,'geometry gate');
  assert.ok(out.report.geometry.maxErrorMm<=.2,'geometry tolerance');
}else if(mode==='bytes'){
  assert.ok(out.bytes instanceof Uint8Array,'Production PDF must be Uint8Array');
  assert.equal(new TextDecoder().decode(out.bytes.subarray(0,8)),'%PDF-1.7','PDF signature');
}else if(mode==='digital'){
  assert.equal(out.report.digital.results.length,1,'visible Barcode/QR group count');
  assert.equal(out.report.digital.results[0].barcodeOk,true,'barcodeOk');
  assert.equal(out.report.digital.results[0].qrOk,true,'qrOk');
}else if(mode==='media'){
  const media=parsePdfMediaBoxV31(out.bytes);
  assert.ok(media.width>0,'MediaBox width');
  assert.ok(media.height>0,'MediaBox height');
}else{
  throw new Error(`Unknown V31_BASE_PROBE ${mode}`);
}

console.log(`V0.31 base probe ${mode} passed`);
