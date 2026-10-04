import assert from 'node:assert/strict';
import { defaultState, stateForTemplate } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { geometryAcceptanceV31, digitalDecodeRequiredCheckV31 } from '../src/acceptanceV31.js';

const mode=process.env.V31_PROBE||'default-geometry';
const clone=v=>structuredClone(v);
const group=s=>s.elements.find(e=>e.type==='barcode-qr-group');
function stateFor(mode){
  if(mode==='mailer'){
    const s=clone(defaultState),p=stateForTemplate('mailer-150010',s.variables);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;return s;
  }
  const s=clone(defaultState),g=group(s);
  const cases={code39:['CODE39','BOX-31-A','QR-C39'],ean:['EAN13','400638133393','QR-EAN13'],upc:['UPCA','03600029145','QR-UPCA'],itf:['ITF14','1234567890123','QR-ITF14'],gs1:['GS1_128','(01)09501101530003(10)ABC123','QR-GS1']};
  if(cases[mode]){const [type,value,qr]=cases[mode];g.barcodeType=type;g.barcodeValue=value;g.qrValue=qr;}
  return s;
}
const state=stateFor(mode),pdf=buildProductionPdfV27(state);
if(mode==='default-geometry'){
  const report=geometryAcceptanceV31(state,pdf);console.log(JSON.stringify({ok:report.ok,maxErrorMm:report.maxErrorMm,failures:report.failures},null,2));assert.equal(report.ok,true);
}else{
  const report=digitalDecodeRequiredCheckV31(state,pdf);console.log(JSON.stringify(report,null,2));assert.equal(report.ok,true);
}
