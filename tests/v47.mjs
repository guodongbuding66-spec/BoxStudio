import assert from 'node:assert/strict';
import fs from 'node:fs';
import { V47_FREE_POLICY, V47_WORKFLOW, V47_TEMPLATE_FILTERS, V47_MARK_QUICK_ACTIONS, freeFeatureAccessV47, searchFreeTemplatesV47, dimensionSummaryV47, materialChoicesV47, referenceFeatureCoverageV47 } from '../src/freeStudioV47.js';
import { defaultsForTemplate } from '../src/geometry.js';

assert.equal(V47_FREE_POLICY.price,0);
assert.equal(V47_FREE_POLICY.accountRequired,false);
assert.equal(V47_FREE_POLICY.watermark,false);
assert.equal(V47_FREE_POLICY.exportGated,false);
assert.equal(V47_FREE_POLICY.featureGated,false);
const access=freeFeatureAccessV47();
assert.equal(access.accountRequired,false);
assert.equal(access.watermark,false);
for(const format of ['SVG','PDF','DXF','PNG','Production PDF'])assert.ok(access.exports.includes(format),`${format} must remain free`);

assert.equal(V47_WORKFLOW.map(x=>x.id).join(','),'templates,structure,design,marks,preview,preflight,export');
assert.ok(V47_TEMPLATE_FILTERS.some(x=>x.id==='mailer'));
assert.ok(V47_TEMPLATE_FILTERS.some(x=>x.id==='folding-carton'));
assert.equal(V47_MARK_QUICK_ACTIONS.length,4);

const all=searchFreeTemplatesV47({});
assert.ok(all.some(x=>x.id==='mailer-150010'),'Original Pacdora-reference Mailer 150010 must stay discoverable');
assert.ok(all.some(x=>x.id==='fefco-0427'),'FEFCO 0427 mailer must stay discoverable');
assert.ok(all.some(x=>x.id==='reverse-tuck-end'),'Folding-carton template must stay discoverable');
assert.ok(all.some(x=>x.id==='imported'),'Existing dieline import must stay discoverable');
assert.ok(searchFreeTemplatesV47({query:'0427'}).every(x=>[x.id,x.code,x.name,x.nameZh,...(x.tags||[])].join(' ').toLowerCase().includes('0427')));
assert.ok(searchFreeTemplatesV47({category:'mailer'}).every(x=>x.v47Category==='mailer'));

for(const template of ['mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','side-seal-rsc']){
  const s=defaultsForTemplate(template),d=dimensionSummaryV47(s);
  assert.ok(d.inside.L>0&&d.inside.W>0&&d.inside.H>0,`${template} inside dimensions invalid`);
  assert.ok(d.manufacturing.L>0&&d.external.L>0,`${template} dimension triplet invalid`);
  assert.ok(d.thicknessMm>0,`${template} thickness invalid`);
  assert.ok(d.external.L+1e-6>=d.inside.L&&d.external.W+1e-6>=d.inside.W&&d.external.H+1e-6>=d.inside.H,`${template} outer size must not be smaller than inside size`);
}
assert.ok(materialChoicesV47().length>=5,'Material presets should expose corrugated and paperboard choices');
const coverage=referenceFeatureCoverageV47();assert.equal(coverage.implemented,coverage.total);assert.equal(coverage.ratio,1);

const ui=fs.readFileSync(new URL('../src/v47FreeStudio.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/v47FreeStudio.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const token of ['永久免费','无需登录','无水印','免费导出'])assert.ok(ui.includes(token)||css.includes(token),`UI free-policy wording missing: ${token}`);
for(const path of ['v47FreeStudio.css','v47FreeStudio.js'])assert.ok(index.includes(path),`${path} is not wired into index.html`);
assert.ok(ui.includes('data-v47-template-search'),'Template library search UI missing');
assert.ok(ui.includes('data-v47-category'),'Template category filters missing');
assert.ok(ui.includes('v47-dimension-card'),'Inside/manufacturing/outside dimension card missing');
assert.ok(ui.includes('v47-mark-actions'),'Mark quick actions missing');
assert.ok(ui.includes('V47_WORKFLOW'),'Seven-step workflow missing');

console.log(`BoxStudio V0.47 passed: free=${V47_FREE_POLICY.price===0} templates=${all.length} materials=${materialChoicesV47().length} coverage=${coverage.implemented}/${coverage.total}`);
