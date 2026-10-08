import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { V59_PRODUCT_VERSION,V59_UI_MODES,V59_GUIDED_FLOW,V59_SIZE_MODES,V59_OUTPUT_FORMATS,V59_REFERENCE_PRINCIPLES,normalizeUiModeV59,templateStudioDataV59,productAcceptanceV59 } from '../src/productExperienceV59.js';

assert.equal(V59_PRODUCT_VERSION,'V0.59');
assert.equal(normalizeUiModeV59('professional'),'professional');assert.equal(normalizeUiModeV59('anything'),'simple');
assert.deepEqual(Object.keys(V59_UI_MODES),['simple','professional']);
assert.deepEqual(V59_GUIDED_FLOW.map(x=>x.tab),['Structure','Design','3D','Marks','Export']);
assert.deepEqual(V59_SIZE_MODES.map(x=>x.id),['internal','manufacturing','external']);
assert.deepEqual(V59_OUTPUT_FORMATS.map(x=>x.id),['pdf','svg','dxf','png']);
assert.equal(V59_OUTPUT_FORMATS.some(x=>x.id==='ai'),false,'Do not advertise a fake AI exporter.');
assert.ok(V59_REFERENCE_PRINCIPLES.filter(x=>x.source==='Pacdora').length>=3);assert.ok(V59_REFERENCE_PRINCIPLES.filter(x=>x.source==='Packform').length>=3);
const acceptance=productAcceptanceV59();assert.equal(acceptance.ok,true,JSON.stringify(acceptance));assert.equal(acceptance.templates,20);

const ids=['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','fefco-0203','straight-tuck-end','sleeve-carton'];
for(const id of ids){const data=templateStudioDataV59(id,{});assert.equal(data.template.id,id);assert.ok(data.presets.length>=2,`${id}: missing quick-size presets`);assert.ok(data.summary.inside.L>0&&data.summary.manufacturing.W>0&&data.summary.external.H>0,`${id}: invalid three-mode dimensions`);assert.equal(data.outputs.length,4)}
const configured=templateStudioDataV59('fefco-0427',{length:360,width:240,height:95,sizeType:'external',materialId:'corrugated-kraft',flute:'B',thickness:3});assert.ok(configured.summary.external.L>0);assert.equal(Number(configured.summary.thickness),3);
assert.throws(()=>templateStudioDataV59('missing-template',{}),/V59_UNKNOWN_TEMPLATE/);

const ui=await readFile(new URL('../src/v59Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('DIELINE PREVIEW'));assert.ok(ui.includes('生成并查看 3D'));assert.ok(ui.includes('data-v59-mode'));assert.ok(ui.includes('data-v59-guided'));assert.ok(ui.includes('data-v59-marks-steps'));
const css=await readFile(new URL('../src/v59Ui.css',import.meta.url),'utf8');assert.ok(css.includes('v59-template-layout'));assert.ok(css.includes('grid-template-columns:330px'));assert.ok(css.includes('data-v59-mode="simple"'));assert.ok(css.includes('@media(max-width:760px)'));
const doc=await readFile(new URL('../docs/V0.59-reference-deep-dive.md',import.meta.url),'utf8');for(const needle of ['Pacdora','Packform','live step-by-step browser automation','Real artwork image upload'])assert.ok(doc.includes(needle),`Reference deep dive missing ${needle}`);
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('v59Ui.css'));assert.ok(index.includes('v59Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));const [major,minor]=pkg.version.split('.').map(Number);assert.ok(major>0||minor>=59,`Expected package version >= 0.59.0, got ${pkg.version}`);assert.equal(pkg.scripts['test:v59'],'node tests/v59.mjs');
console.log(`BoxStudio V0.59 reference UX convergence passed: templates=${acceptance.templates} flow=${V59_GUIDED_FLOW.length} outputs=${V59_OUTPUT_FORMATS.length} references=${V59_REFERENCE_PRINCIPLES.length} package=${pkg.version}`);
