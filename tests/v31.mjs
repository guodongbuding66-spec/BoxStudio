import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, stateForTemplate } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { buildAcceptedProductionPdfV31 } from '../src/productionAcceptanceV31.js';
import { runV31Acceptance, parsePdfMediaBoxV31 } from '../src/acceptanceV31.js';

const clone=v=>structuredClone(v);
function withTemplate(template){const s=clone(defaultState),preset=stateForTemplate(template,s.variables);s.structure=preset.structure;s.elements=preset.elements;s.variables=preset.variables;return s;}
function group(state){return state.elements.find(e=>e.type==='barcode-qr-group');}
function accepted(state){
  const out=buildAcceptedProductionPdfV31(state);
  assert.equal(out.report.ok,true,out.report.summary);
  assert.equal(out.report.digital.ok,true);
  assert.equal(out.report.geometry.ok,true);
  assert.ok(out.report.geometry.maxErrorMm<=.2);
  assert.ok(out.bytes instanceof Uint8Array,'accepted Production PDF must be Uint8Array bytes');
  assert.equal(new TextDecoder().decode(out.bytes.subarray(0,8)),'%PDF-1.7','accepted output must be a PDF 1.7 document');
  return out;
}

const base=clone(defaultState),baseOut=accepted(base);assert.equal(baseOut.report.digital.results.length,1);assert.equal(baseOut.report.digital.results[0].barcodeOk,true);assert.equal(baseOut.report.digital.results[0].qrOk,true);const media=parsePdfMediaBoxV31(baseOut.bytes);assert.ok(media.width>0&&media.height>0);

const mailer=withTemplate('mailer-150010'),mailerOut=accepted(mailer);assert.equal(group(mailer).w,200);assert.equal(group(mailer).h,64);assert.equal(mailerOut.report.digital.results[0].ok,true);

const cases=[
  ['CODE39','BOX-31-A','QR-C39'],
  ['EAN13','400638133393','QR-EAN13'],
  ['UPCA','03600029145','QR-UPCA'],
  ['ITF14','1234567890123','QR-ITF14'],
  ['GS1_128','(01)09501101530003(10)ABC123','QR-GS1']
];
for(const [type,value,qr] of cases){const s=clone(defaultState),g=group(s);g.barcodeType=type;g.barcodeValue=value;g.qrValue=qr;const r=accepted(s).report.digital.results[0];assert.equal(r.ok,true,`${type}: ${r.error||''}`);assert.equal(r.type,type);}

const frozen=clone(defaultState),pdf=buildProductionPdfV27(frozen);
const sourceChanged=clone(frozen);sourceChanged.variables.sku='DIFFERENT-SKU';const sourceReport=runV31Acceptance(sourceChanged,pdf);assert.equal(sourceReport.ok,false);assert.equal(sourceReport.digital.ok,false);assert.ok(sourceReport.digital.failures.length>0,'changed source must be rejected by digital decode gate');

const moved=clone(frozen);group(moved).x+=1;const movedReport=runV31Acceptance(moved,pdf);assert.equal(movedReport.ok,false);assert.equal(movedReport.geometry.ok,false);assert.ok(movedReport.geometry.failures.some(x=>String(x.id).startsWith('frame.')),'1 mm frame drift must exceed the 0.2 mm acceptance limit');

for(const angle of [90,180,270]){const rotated=clone(defaultState);group(rotated).r=angle;assert.throws(()=>buildAcceptedProductionPdfV31(rotated),/Required Check failed/);const report=runV31Acceptance(rotated,buildProductionPdfV27(rotated));assert.equal(report.geometry.ok,false);assert.ok(report.geometry.failures.some(x=>String(x.id).startsWith('rotation.')));}

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.31'));assert.ok(index.includes('v31Ui.css'));assert.ok(index.includes('v31Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.31.0');
console.log('BoxStudio V0.31 digital decode + geometry acceptance tests passed');
