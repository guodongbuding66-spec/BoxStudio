import assert from 'node:assert/strict';
import { defaultState, stateForTemplate } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { buildAcceptedProductionPdfV31 } from '../src/productionAcceptanceV31.js';
import { geometryAcceptanceV31, digitalDecodeRequiredCheckV31, runV31Acceptance } from '../src/acceptanceV31.js';

const mode=process.env.V31_PROBE||'default-geometry';
const clone=v=>structuredClone(v);
const group=s=>s.elements.find(e=>e.type==='barcode-qr-group');
function mailerState(){const s=clone(defaultState),p=stateForTemplate('mailer-150010',s.variables);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;return s;}
function stateFor(mode){
  if(mode.startsWith('mailer'))return mailerState();
  const s=clone(defaultState),g=group(s);
  const cases={code39:['CODE39','BOX-31-A','QR-C39'],ean:['EAN13','400638133393','QR-EAN13'],upc:['UPCA','03600029145','QR-UPCA'],itf:['ITF14','1234567890123','QR-ITF14'],gs1:['GS1_128','(01)09501101530003(10)ABC123','QR-GS1']};
  if(cases[mode]){const [type,value,qr]=cases[mode];g.barcodeType=type;g.barcodeValue=value;g.qrValue=qr;}
  return s;
}
if(mode==='source-mismatch'){
  const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen),changed=clone(frozen);changed.variables.sku='DIFFERENT-SKU';const r=runV31Acceptance(changed,pdf);console.log(JSON.stringify(r.digital,null,2));assert.equal(r.ok,false);assert.equal(r.digital.ok,false);
}else if(mode==='moved-frame'){
  const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen),changed=clone(frozen);group(changed).x+=1;const r=runV31Acceptance(changed,pdf);console.log(JSON.stringify(r.geometry,null,2));assert.equal(r.ok,false);assert.equal(r.geometry.ok,false);
}else if(mode.startsWith('rotation-')){
  const angle=Number(mode.split('-')[1]),s=clone(defaultState);group(s).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(s),/Required Check failed/);const r=runV31Acceptance(s,buildProductionPdfV27(s));console.log(JSON.stringify(r.geometry.failures,null,2));assert.equal(r.geometry.ok,false);assert.ok(r.geometry.failures.some(x=>x.id==='rotation.barcodeQr'));
}else{
  const state=stateFor(mode),pdf=buildProductionPdfV27(state);
  if(mode==='default-geometry'||mode==='mailer-geometry'){
    const report=geometryAcceptanceV31(state,pdf);console.log(JSON.stringify({ok:report.ok,maxErrorMm:report.maxErrorMm,failures:report.failures},null,2));assert.equal(report.ok,true);
  }else{
    const report=digitalDecodeRequiredCheckV31(state,pdf);console.log(JSON.stringify(report,null,2));assert.equal(report.ok,true);
  }
}
