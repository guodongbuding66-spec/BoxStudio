import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { digitalDecodeRequiredCheckV31 } from '../src/acceptanceV31.js';

const check=process.env.V31_DIGITAL_CHECK||'result';
const state=structuredClone(defaultState);
const pdf=buildProductionPdfV27(state);
const report=digitalDecodeRequiredCheckV31(state,pdf);
const result=report.results[0];

if(check==='result'){
  assert.equal(report.results.length,1,'default state must expose one Barcode/QR group');
  assert.ok(result,'digital result missing');
  assert.equal(result.stage,undefined,`digital gate stopped before decode at stage ${result.stage}: ${result.error||''}`);
}else if(check==='barcode'){
  assert.ok(result,'digital result missing');
  assert.equal(result.barcodeOk,true,`barcode decode failed: ${result.error||''}`);
}else if(check==='qr'){
  assert.ok(result,'digital result missing');
  assert.equal(result.qrOk,true,`QR decode failed: ${result.error||''}`);
}else{
  throw new Error(`Unknown V31_DIGITAL_CHECK ${check}`);
}

console.log(`V0.31 digital probe ${check} passed`);
