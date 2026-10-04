import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, stateForTemplate } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { buildAcceptedProductionPdfV31 } from '../src/productionAcceptanceV31.js';
import { runV31Acceptance, parsePdfMediaBoxV31 } from '../src/acceptanceV31.js';

const clone=v=>structuredClone(v);
function withTemplate(template){const s=clone(defaultState),preset=stateForTemplate(template,s.variables);s.structure=preset.structure;s.elements=preset.elements;s.variables=preset.variables;return s;}
function group(state){return state.elements.find(e=>e.type==='barcode-qr-group');}
function accepted(state){const out=buildAcceptedProductionPdfV31(state);assert.equal(out.report.ok,true,out.report.summary);assert.equal(out.report.digital.ok,true);assert.equal(out.report.geometry.ok,true);assert.ok(out.report.geometry.maxErrorMm<=.2);return out;}

const base=clone(defaultState),baseOut=accepted(base);assert.ok(baseOut.bytes.length>1000);assert.equal(baseOut.report.digital.results.length,1);assert.equal(baseOut.report.digital.results[0].decoded.barcode,base.variables.sku);assert.equal(baseOut.report.digital.results[0].decoded.qr,base.variables.qrValue);const media=parsePdfMediaBoxV31(baseOut.bytes);assert.ok(media.width>0&&media.height>0);

const mailer=withTemplate('mailer-150010'),mailerOut=accepted(mailer);assert.equal(group(mailer).w,200);assert.equal(group(mailer).h,64);assert.equal(mailerOut.report.digital.results[0].decoded.barcode,mailer.variables.sku);

const cases=[
  ['CODE39','BOX-31-A','QR-C39'],
  ['EAN13','400638133393','QR-EAN13'],
  ['UPCA','03600029145','QR-UPCA'],
  ['ITF14','1234567890123','QR-ITF14'],
  ['GS1_128','(01)09501101530003(10)ABC123','QR-GS1']
];
for(const [type,value,qr] of cases){const s=clone(defaultState),g=group(s);g.barcodeType=type;g.barcodeValue=value;g.qrValue=qr;const out=accepted(s),r=out.report.digital.results[0];assert.equal(r.type,type);assert.equal(r.barcodeOk,true,`${type}: ${r.error||''}`);assert.equal(r.qrOk,true,`${type}: ${r.error||''}`);assert.equal(r.decoded.qr,qr);}

const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen);
const sourceChanged=clone(frozen);sourceChanged.variables.sku='DIFFERENT-SKU';const sourceReport=runV31Acceptance(sourceChanged,pdf);assert.equal(sourceReport.ok,false);assert.equal(sourceReport.digital.ok,false);assert.ok(sourceReport.digital.failures.some(x=>x.barcodeOk===false));

const moved=clone(frozen);group(moved).x+=1;const movedReport=runV31Acceptance(moved,pdf);assert.equal(movedReport.ok,false);assert.equal(movedReport.geometry.ok,false);assert.ok(movedReport.geometry.failures.some(x=>x.id==='frame.barcodeQr'));

for(const angle of [90,180,270]){const rotated=clone(defaultState);group(rotated).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(rotated),/Required Check failed/);const report=runV31Acceptance(rotated,buildProductionPdfV27(rotated));assert.equal(report.geometry.ok,false);assert.ok(report.geometry.failures.some(x=>x.id==='rotation.barcodeQr'));}

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.31'));assert.ok(index.includes('v31Ui.css'));assert.ok(index.includes('v31Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.31.0');
console.log('BoxStudio V0.31 digital decode + geometry acceptance tests passed');
