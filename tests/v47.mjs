import assert from 'node:assert/strict';
import fs from 'node:fs';
import { V47_FREE_POLICY, V47_WORKFLOW, V47_TEMPLATE_FILTERS, V47_MARK_QUICK_ACTIONS, freeFeatureAccessV47, searchFreeTemplatesV47, dimensionSummaryV47, materialChoicesV47, referenceFeatureCoverageV47 } from '../src/freeStudioV47.js';
import { saveProjectSnapshotV47, renameProjectSnapshotV47, duplicateProjectSnapshotV47, loadProjectSnapshotV47, deleteProjectSnapshotV47, projectLibrarySummaryV47 } from '../src/projectWorkspaceV47.js';
import { defaultsForTemplate } from '../src/geometry.js';

assert.equal(V47_FREE_POLICY.price,0);assert.equal(V47_FREE_POLICY.accountRequired,false);assert.equal(V47_FREE_POLICY.watermark,false);assert.equal(V47_FREE_POLICY.exportGated,false);assert.equal(V47_FREE_POLICY.featureGated,false);
const access=freeFeatureAccessV47();assert.equal(access.accountRequired,false);assert.equal(access.watermark,false);for(const format of ['SVG','PDF','DXF','PNG','Production PDF'])assert.ok(access.exports.includes(format),`${format} must remain free`);
assert.equal(V47_WORKFLOW.map(x=>x.id).join(','),'templates,structure,design,marks,preview,preflight,export');assert.ok(V47_TEMPLATE_FILTERS.some(x=>x.id==='mailer'));assert.ok(V47_TEMPLATE_FILTERS.some(x=>x.id==='folding-carton'));assert.equal(V47_MARK_QUICK_ACTIONS.length,4);

const all=searchFreeTemplatesV47({});assert.ok(all.some(x=>x.id==='mailer-150010'),'Original Pacdora-reference Mailer 150010 must stay discoverable');assert.ok(all.some(x=>x.id==='fefco-0427'),'FEFCO 0427 mailer must stay discoverable');assert.ok(all.some(x=>x.id==='reverse-tuck-end'),'Folding-carton template must stay discoverable');assert.ok(all.some(x=>x.id==='imported'),'Existing dieline import must stay discoverable');assert.ok(searchFreeTemplatesV47({query:'0427'}).every(x=>[x.id,x.code,x.name,x.nameZh,...(x.tags||[])].join(' ').toLowerCase().includes('0427')));assert.ok(searchFreeTemplatesV47({category:'mailer'}).every(x=>x.v47Category==='mailer'));

for(const template of ['mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','side-seal-rsc']){const s=defaultsForTemplate(template),d=dimensionSummaryV47(s);assert.ok(d.inside.L>0&&d.inside.W>0&&d.inside.H>0,`${template} inside dimensions invalid`);assert.ok(d.manufacturing.L>0&&d.external.L>0,`${template} dimension triplet invalid`);assert.ok(d.thicknessMm>0,`${template} thickness invalid`);assert.ok(d.external.L+1e-6>=d.inside.L&&d.external.W+1e-6>=d.inside.W&&d.external.H+1e-6>=d.inside.H,`${template} outer size must not be smaller than inside size`)}
assert.ok(materialChoicesV47().length>=5,'Material presets should expose corrugated and paperboard choices');const coverage=referenceFeatureCoverageV47();assert.equal(coverage.implemented,coverage.total);assert.equal(coverage.ratio,1);

const memory=new Map(),storage={getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
const baseState={projectName:'Mailer Client A',structure:{template:'mailer-150010',length:320,width:220,height:80},elements:[{id:'sku'}],variables:{sku:'A-100'}};
const saved=saveProjectSnapshotV47(baseState,{},storage);assert.ok(saved.id);assert.equal(saved.name,'Mailer Client A');assert.equal(projectLibrarySummaryV47(storage).count,1);
const renamed=renameProjectSnapshotV47(saved.id,'Mailer Client A Rev 2',storage);assert.equal(renamed.name,'Mailer Client A Rev 2');
const copied=duplicateProjectSnapshotV47(saved.id,{name:'Mailer Client A Copy'},storage);assert.notEqual(copied.id,saved.id);assert.equal(projectLibrarySummaryV47(storage).count,2);assert.equal(loadProjectSnapshotV47(copied.id,storage).variables.sku,'A-100');deleteProjectSnapshotV47(saved.id,storage);assert.equal(projectLibrarySummaryV47(storage).count,1);

const ui=fs.readFileSync(new URL('../src/v47FreeStudio.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../src/v47FreeStudio.css',import.meta.url),'utf8'),index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const token of ['永久免费','无需登录','无水印','免费导出'])assert.ok(ui.includes(token)||css.includes(token),`UI free-policy wording missing: ${token}`);for(const path of ['v47FreeStudio.css','v47FreeStudio.js'])assert.ok(index.includes(path),`${path} is not wired into index.html`);
for(const token of ['data-v47-template-search','data-v47-category','v47-dimension-card','v47-mark-actions','V47_WORKFLOW','v47-project-switcher','data-v47-linked-review','data-v47-professional'])assert.ok(ui.includes(token),`V0.47 UI capability missing: ${token}`);
assert.ok(ui.includes('openLinkedReviewV35'),'Linked 2D↔3D review must be promoted into V0.47');assert.ok(ui.includes('openProfessional2D'),'Professional object/layer editor must be promoted into V0.47');

console.log(`BoxStudio V0.47 passed: free=${V47_FREE_POLICY.price===0} templates=${all.length} materials=${materialChoicesV47().length} coverage=${coverage.implemented}/${coverage.total} projects=${projectLibrarySummaryV47(storage).count}`);
