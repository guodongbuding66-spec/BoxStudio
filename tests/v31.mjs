import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { digitalDecodeFromProductionPdfV31 } from '../src/digitalDecodeV31.js';
import { geometryAcceptanceFromProductionPdfV31 } from '../src/geometryAcceptanceV31.js';
import { runPreflight, runProductionAcceptanceV31 } from '../src/preflightV31.js';
import { createProductionJob } from '../src/productionJobs.js';

function stateFor(type,value,qr='V31-QR-CHECK'){
  const s=structuredClone(defaultState),el=s.elements.find(e=>e.type==='barcode-qr-group');
  el.barcodeType=type;el.barcodeValue=value;el.qrValue=qr;s.variables.qrValue=qr;return s;
}

for(const [type,value] of [
  ['CODE39','BOX-V31-001'],
  ['EAN13','400638133393'],
  ['UPCA','03600029145'],
  ['ITF14','1001234500001'],
  ['GS1_128','(01)09501101530003(10)ABC123'],
]){
  const s=stateFor(type,value),pdf=buildProductionPdfV27(s),decoded=digitalDecodeFromProductionPdfV31(s,pdf);
  assert.equal(decoded.ok,true,`${type} decode failed: ${JSON.stringify(decoded)}`);
  assert.equal(decoded.barcode.ok,true,`${type} barcode should round-trip from PDF artifact`);
  assert.equal(decoded.qr.ok,true,`${type} QR should round-trip from PDF artifact`);
  assert.equal(decoded.source,'production-pdf-vector-raster');
}

const base=structuredClone(defaultState),pdf=buildProductionPdfV27(base),geometry=geometryAcceptanceFromProductionPdfV31(base,pdf,{toleranceMm:.2});
assert.equal(geometry.ok,true,JSON.stringify(geometry.failed.slice(0,5)));
assert.ok(geometry.probeCount>10,'geometry acceptance should inspect page, dieline and core marks');
assert.ok(geometry.maxErrorMm<=.2);
const changed=structuredClone(base);changed.elements.find(e=>e.id==='barcodeQr').x+=5;const stale=geometryAcceptanceFromProductionPdfV31(changed,pdf,{toleranceMm:.2});assert.equal(stale.ok,false,'stale PDF must fail geometry acceptance');

const acceptance=runProductionAcceptanceV31(base);assert.equal(acceptance.ok,true);assert.equal(acceptance.digital.ok,true);assert.equal(acceptance.geometry.ok,true);
const checks=runPreflight(base);const decodeCheck=checks.find(x=>x.code==='DIGITAL_DECODE_V31'),geoCheck=checks.find(x=>x.code==='PREVIEW_PDF_GEOMETRY_V31');assert.equal(decodeCheck?.severity,'pass');assert.equal(geoCheck?.severity,'pass');
const job=createProductionJob(base,{actor:'tester',role:'operator'});assert.equal(job.preflight.errorCount,0,JSON.stringify(job.preflight.errors));

assert.equal(STORAGE_KEY,'boxstudio-mvp-v31');assert.ok(LEGACY_STORAGE_KEYS.includes('boxstudio-mvp-v30'));assert.equal(defaultState.exportOptions.v31RequiredChecks,true);assert.equal(defaultState.exportOptions.geometryToleranceMm,.2);assert.equal(defaultState.exportOptions.productionSerializer,'v0.27-native-cubic-production');
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.31'));assert.ok(index.includes('v31Ui.css'));assert.ok(index.includes('v31Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.31.0');
console.log('BoxStudio V0.31 tests passed');
