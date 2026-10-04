import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, stateForTemplate } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { buildAcceptedProductionPdfV31 } from '../src/productionAcceptanceV31.js';
import { geometryAcceptanceV31, digitalDecodeRequiredCheckV31, runV31Acceptance, parsePdfMediaBoxV31 } from '../src/acceptanceV31.js';

const mode=process.env.V31_PROBE||'default-geometry';
const clone=v=>structuredClone(v);
const group=s=>s.elements.find(e=>e.type==='barcode-qr-group');
function mailerState(){const s=clone(defaultState),p=stateForTemplate('mailer-150010',s.variables);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;return s;}
const cases={code39:['CODE39','BOX-31-A','QR-C39'],ean:['EAN13','400638133393','QR-EAN13'],upc:['UPCA','03600029145','QR-UPCA'],itf:['ITF14','1234567890123','QR-ITF14'],gs1:['GS1_128','(01)09501101530003(10)ABC123','QR-GS1']};
function stateFor(kind){if(kind.startsWith('mailer'))return mailerState();const s=clone(defaultState),g=group(s);if(cases[kind]){const [type,value,qr]=cases[kind];g.barcodeType=type;g.barcodeValue=value;g.qrValue=qr;}return s;}
function assertAccepted(state,label='accepted'){const out=buildAcceptedProductionPdfV31(state);assert.equal(out.report.ok,true,`${label}: ${out.report.summary}`);assert.equal(out.report.geometry.ok,true,`${label}: geometry`);assert.equal(out.report.digital.ok,true,`${label}: digital`);assert.ok(out.report.geometry.maxErrorMm<=.2,`${label}: geometry tolerance`);return out;}
function assertBaseDetails(){const base=clone(defaultState),out=assertAccepted(base,'base');assert.ok(out.bytes.length>1000,'base pdf byte length');assert.equal(out.report.digital.results.length,1,'base digital group count');assert.equal(out.report.digital.results[0].barcodeOk,true,'base barcodeOk');assert.equal(out.report.digital.results[0].qrOk,true,'base qrOk');const m=parsePdfMediaBoxV31(out.bytes);assert.ok(m.width>0&&m.height>0,'base MediaBox');return out;}
function assertMailerDetails(){const s=mailerState(),out=assertAccepted(s,'mailer');assert.equal(group(s).w,200,'mailer width');assert.equal(group(s).h,64,'mailer height');assert.equal(out.report.digital.results[0].ok,true,'mailer digital result');return out;}
function assertTypeDetails(){for(const [kind,[type]] of Object.entries(cases)){const r=assertAccepted(stateFor(kind),kind).report.digital.results[0];assert.equal(r.ok,true,`${kind} result`);assert.equal(r.type,type,`${kind} type ${r.type} != ${type}`);}return true;}

if(mode==='exact-base-details'){assertBaseDetails();console.log('exact-base-details: PASS');
}else if(mode==='exact-mailer-details'){assertMailerDetails();console.log('exact-mailer-details: PASS');
}else if(mode==='exact-type-details'){assertTypeDetails();console.log('exact-type-details: PASS');
}else if(mode==='sequence-positive'){for(const kind of ['base','mailer','code39','ean','upc','itf','gs1']){const s=kind==='base'?clone(defaultState):kind==='mailer'?mailerState():stateFor(kind);const out=assertAccepted(s,kind);console.log(`${kind}: PASS ${out.report.summary}`);}
}else if(mode==='exact-positive-details'){assertBaseDetails();assertMailerDetails();assertTypeDetails();console.log('exact-positive-details: PASS');
}else if(mode==='sequence-negative'){
  const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen);const changed=clone(frozen);changed.variables.sku='DIFFERENT-SKU';let r=runV31Acceptance(changed,pdf);assert.equal(r.ok,false,'source mismatch');assert.equal(r.digital.ok,false,'source mismatch digital');const moved=clone(frozen);group(moved).x+=1;r=runV31Acceptance(moved,pdf);assert.equal(r.ok,false,'moved');assert.equal(r.geometry.ok,false,'moved geometry');for(const angle of [90,180,270]){const s=clone(defaultState);group(s).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(s),/Required Check failed/);r=runV31Acceptance(s,buildProductionPdfV27(s));assert.equal(r.geometry.ok,false);}console.log('sequence-negative: PASS');
}else if(mode==='exact-negative-details'){
  const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen);const sourceChanged=clone(frozen);sourceChanged.variables.sku='DIFFERENT-SKU';let r=runV31Acceptance(sourceChanged,pdf);assert.equal(r.ok,false);assert.equal(r.digital.ok,false);assert.ok(r.digital.failures.length>0,'digital failures');const moved=clone(frozen);group(moved).x+=1;r=runV31Acceptance(moved,pdf);assert.equal(r.ok,false);assert.equal(r.geometry.ok,false);assert.ok(r.geometry.failures.some(x=>String(x.id).startsWith('frame.')),'frame failure detail');for(const angle of [90,180,270]){const s=clone(defaultState);group(s).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(s),/Required Check failed/);r=runV31Acceptance(s,buildProductionPdfV27(s));assert.equal(r.geometry.ok,false);assert.ok(r.geometry.failures.some(x=>String(x.id).startsWith('rotation.')),`rotation ${angle} detail`);}console.log('exact-negative-details: PASS');
}else if(mode==='sequence-all'){
  const base=assertAccepted(clone(defaultState),'base');assert.ok(parsePdfMediaBoxV31(base.bytes).width>0);assertAccepted(mailerState(),'mailer');for(const kind of ['code39','ean','upc','itf','gs1'])assertAccepted(stateFor(kind),kind);const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen),changed=clone(frozen);changed.variables.sku='DIFFERENT-SKU';assert.equal(runV31Acceptance(changed,pdf).ok,false);const moved=clone(frozen);group(moved).x+=1;assert.equal(runV31Acceptance(moved,pdf).geometry.ok,false);for(const angle of [90,180,270]){const s=clone(defaultState);group(s).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(s),/Required Check failed/);}console.log('sequence-all: PASS');
}else if(mode==='meta'){
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.31'));assert.ok(index.includes('v31Ui.css'));assert.ok(index.includes('v31Ui.js'));const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.31.0');console.log('meta: PASS');
}else if(mode==='source-mismatch'){
  const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen),changed=clone(frozen);changed.variables.sku='DIFFERENT-SKU';const r=runV31Acceptance(changed,pdf);console.log(JSON.stringify(r.digital,null,2));assert.equal(r.ok,false);assert.equal(r.digital.ok,false);
}else if(mode==='moved-frame'){
  const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen),changed=clone(frozen);group(changed).x+=1;const r=runV31Acceptance(changed,pdf);console.log(JSON.stringify(r.geometry,null,2));assert.equal(r.ok,false);assert.equal(r.geometry.ok,false);
}else if(mode.startsWith('rotation-')){
  const angle=Number(mode.split('-')[1]),s=clone(defaultState);group(s).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(s),/Required Check failed/);const r=runV31Acceptance(s,buildProductionPdfV27(s));console.log(JSON.stringify(r.geometry.failures,null,2));assert.equal(r.geometry.ok,false);assert.ok(r.geometry.failures.some(x=>x.id==='rotation.barcodeQr'));
}else{
  const state=stateFor(mode),pdf=buildProductionPdfV27(state);if(mode==='default-geometry'||mode==='mailer-geometry'){const report=geometryAcceptanceV31(state,pdf);console.log(JSON.stringify({ok:report.ok,maxErrorMm:report.maxErrorMm,failures:report.failures},null,2));assert.equal(report.ok,true);}else{const report=digitalDecodeRequiredCheckV31(state,pdf);console.log(JSON.stringify(report,null,2));assert.equal(report.ok,true);}
}
