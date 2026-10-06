import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, stateForTemplate } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { V58_PRODUCT_VERSION,V58_FREE_POLICY,V58_STUDIO_FLOW,V58_REFERENCE_PATTERNS,V58_MARK_GROUPS,V58_MARK_PRESETS,V58_PRINT_ADVISORIES,addMarkPresetV58,markPanelOptionsV58,studioSummaryV58,productAcceptanceV58 } from '../src/productExperienceV58.js';

assert.equal(V58_PRODUCT_VERSION,'V0.58');
assert.equal(V58_FREE_POLICY.freeForEveryone,true);assert.equal(V58_FREE_POLICY.loginRequired,false);assert.equal(V58_FREE_POLICY.paywall,false);assert.equal(V58_FREE_POLICY.trial,false);assert.equal(V58_FREE_POLICY.downloadGate,false);
assert.deepEqual(V58_STUDIO_FLOW.map(x=>x.id),['templates','size','design','preview','marks','export']);
assert.ok(V58_REFERENCE_PATTERNS.some(x=>x.source==='Pacdora'));assert.ok(V58_REFERENCE_PATTERNS.some(x=>x.source.includes('Packform')));
assert.ok(V58_PRINT_ADVISORIES.length>=5);
const grouped=new Set(V58_MARK_GROUPS.flatMap(x=>x.items));for(const id of grouped)assert.ok(V58_MARK_PRESETS[id],`Missing mark preset ${id}`);assert.ok(Object.keys(V58_MARK_PRESETS).length>=13);
assert.equal(productAcceptanceV58().ok,true,JSON.stringify(productAcceptanceV58()));

const TEMPLATE_IDS=['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','fefco-0203','straight-tuck-end','sleeve-carton'];
let checked=0;
for(const id of TEMPLATE_IDS){
  const preset=stateForTemplate(id,defaultState.variables),s=structuredClone(defaultState);s.structure=preset.structure;s.elements=preset.elements;s.variables=preset.variables;s.selectedId=preset.selectedId;s.page='editor';s.editorTab='Marks';
  const panels=markPanelOptionsV58(s);assert.ok(panels.length>0,`${id}: no mark panels`);const target=panels[0];let work=s;
  for(const markId of ['sku','weights','barcodeQr','up','fragile','dry']){const r=addMarkPresetV58(work,markId,{panelId:target.id});work=r.state;const e=r.element;assert.equal(e.panelId,target.id);assert.ok(e.x>=0&&e.y>=0,`${id}/${markId}: negative mark position`);assert.ok(e.x+e.w<=target.w+0.001,`${id}/${markId}: mark exceeds panel width`);assert.ok(e.y+e.h<=target.h+0.001,`${id}/${markId}: mark exceeds panel height`);checked++}
  const summary=studioSummaryV58(work);assert.equal(summary.templateId,id);assert.equal(summary.panelCount,panels.length);assert.ok(summary.markCount>=preset.elements.filter(e=>e.group==='marks').length+6);
  const g=generateGeometry(work.structure);assert.ok(g.width>0&&g.height>0,`${id}: invalid geometry after marks`);
}
assert.throws(()=>addMarkPresetV58(defaultState,'missing'),/V58_UNKNOWN_MARK_PRESET/);

const ui=await readFile(new URL('../src/v58Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('SHIPPING MARK STUDIO'));assert.ok(ui.includes('LIVE 3D'));assert.ok(ui.includes('高级生产'));assert.ok(ui.includes('data-v58-mark'));
const css=await readFile(new URL('../src/v58Ui.css',import.meta.url),'utf8');assert.ok(css.includes('data-v58-studio'));assert.ok(css.includes('v58-mini3d'));assert.ok(css.includes('v58-marks-studio'));assert.ok(css.includes('data-v58-advanced'));
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.58'));assert.ok(index.includes('v58Ui.css'));assert.ok(index.includes('v58Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.58.0');assert.equal(pkg.scripts['test:v58'],'node tests/v58.mjs');
console.log(`BoxStudio V0.58 core packaging studio passed: templates=${TEMPLATE_IDS.length} markInsertions=${checked} presets=${Object.keys(V58_MARK_PRESETS).length} flow=${V58_STUDIO_FLOW.length}`);
