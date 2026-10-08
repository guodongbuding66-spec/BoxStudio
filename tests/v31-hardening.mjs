import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { digitalDecodeFromProductionPdfV31 } from '../src/digitalDecodeGateV31.js';
import { geometryAcceptanceFromProductionPdfV31 } from '../src/geometryAcceptanceV31.js';
import { runPreflight } from '../src/preflightV31.js';
import { createProductionJob } from '../src/productionJobs.js';
import { productionOutputGateV24 } from '../src/productionOutputV24.js';

const clone=v=>structuredClone(v);
const codeGroup=s=>s.elements.find(e=>e.id==='barcodeQr');

function damageOneBarcodeBar(pdfBytes){
  const text=Buffer.from(pdfBytes).toString('latin1');
  const re=/(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re\s+f\b/g;
  let m;
  while((m=re.exec(text))){
    const w=Number(m[3]),h=Number(m[4]);
    // Barcode bars in the default 250x80 block are tall, narrow filled PDF rectangles.
    if(h>100&&w>0&&w<30){
      const at=m.index+m[0].lastIndexOf('f');
      const out=Uint8Array.from(pdfBytes);
      // Same-byte-length mutation keeps xref offsets valid while removing one filled bar
      // from the raster input consumed by the digital decoder.
      out[at]='S'.charCodeAt(0);
      return out;
    }
  }
  throw new Error('Unable to locate a tall barcode bar in final Production PDF bytes.');
}

// P0-1: decode must be based on the final PDF artifact, not source/DOM state.
{
  const state=clone(defaultState),pdf=buildProductionPdfV27(state),clean=digitalDecodeFromProductionPdfV31(state,pdf);
  assert.equal(clean.ok,true,JSON.stringify(clean));
  const damagedPdf=damageOneBarcodeBar(pdf),damaged=digitalDecodeFromProductionPdfV31(state,damagedPdf);
  assert.equal(damaged.ok,false,'direct final-PDF barcode corruption must fail digital acceptance');
  assert.equal(damaged.barcode.ok,false,'corrupted final-PDF barcode must be detected by decode');
}

// P0-2: technical outlined text must be independently read back from final PDF paint geometry.
{
  const state=clone(defaultState);
  state.exportOptions.outlineText=true;
  state.exportOptions.fontMode='technical';
  const pdf=buildProductionPdfV27(state),geometry=geometryAcceptanceFromProductionPdfV31(state,pdf,{toleranceMm:.2});
  assert.equal(geometry.ok,true,JSON.stringify(geometry.failed.slice(0,8)));
  assert.ok(geometry.outlinedTextVerified>0,'outlined text elements must be included in Preview/PDF acceptance');
  assert.ok(geometry.checks.some(x=>x.kind==='outlined-text-keypoint'&&x.ok),'final-PDF outlined glyph key point must be measured');
}

// P0-3: serializer rotations that are not represented in final PDF must fail closed.
for(const angle of [90,180,270]){
  const state=clone(defaultState);
  codeGroup(state).r=angle;
  assert.throws(()=>buildProductionPdfV27(state),e=>e.code==='BARCODE_PRODUCTION_BLOCKED'&&e.errors.some(x=>x.code==='BARCODE_DIRECTION'),`rotation ${angle}° must be blocked before generating a misleading PDF`);
}

// P0-4: Required means non-bypassable, including legacy/persisted state with the flag disabled.
{
  const state=clone(defaultState);
  state.exportOptions.v31RequiredChecks=false;
  const checks=runPreflight(state),disabled=checks.find(x=>x.code==='V31_REQUIRED_CHECKS_DISABLED');
  assert.equal(disabled?.severity,'error','disabling a required V0.31 check must be a preflight error');
  const job=createProductionJob(state,{actor:'v31-hardening',role:'operator'});
  assert.ok(job.preflight.errorCount>0,'disabled required checks must prevent a clean Production Job');
  const gate=productionOutputGateV24(state,{status:'approved'});
  assert.equal(gate.ok,false,'approved-output gate must also reject disabled required checks');
  assert.equal(gate.stage,'v31-required-checks');
}

console.log('BoxStudio V0.31 P0 hardening tests passed');
