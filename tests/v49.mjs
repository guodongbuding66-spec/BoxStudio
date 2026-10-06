import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, stateForTemplate } from '../src/model.js';
import { actionableTemplatesV47 } from '../src/productExperienceV47.js';
import { ensureLinkedWorkspaceV49, selectLinkedPanelV49, setLinkedFoldProgressV49, buildLinkedWorkspaceModelV49, linkedWorkspaceAcceptanceV49, cycleLinkedPanelV49, V49_FOLD_PRESETS, V49_LINKED_SCHEMA } from '../src/linkedWorkspaceV49.js';

const projectFor=id=>{const p=stateForTemplate(id,defaultState.variables),s=structuredClone(defaultState);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;s.selectedId=p.selectedId;s.page='editor';s.editorTab='3D';s.foldProgress=100;return s};
const templates=actionableTemplatesV47();assert.ok(templates.length>=8,'V0.49 must retain the expanded verified template catalog.');
for(const t of templates){const state=projectFor(t.id),model=buildLinkedWorkspaceModelV49(state),accept=linkedWorkspaceAcceptanceV49(state);assert.equal(model.schema,V49_LINKED_SCHEMA);assert.ok(model.records.length>0,`${t.id} needs linked panels`);assert.equal(model.records.length,model.review.graph.nodes.length,`${t.id} 2D/3D panel identity drift`);assert.ok(model.selected,`${t.id} needs an initial selected panel`);assert.equal(accept.ok,true,`${t.id}: ${JSON.stringify(accept.errors)}`);assert.equal(accept.summary.panels,model.review.graph.nodes.length);assert.equal(new Set(model.records.map(r=>r.panelId)).size,model.records.length,`${t.id} panel ids must be unique`);}

let state=ensureLinkedWorkspaceV49(structuredClone(defaultState)),model=buildLinkedWorkspaceModelV49(state);assert.equal(state.linkedV49.schema,V49_LINKED_SCHEMA);assert.equal(state.linkedV49.selectedPanelId,state.reviewV35.selectedPanelId);assert.ok(model.records.length>=6);
const first=model.records[0].panelId,second=model.records[1].panelId;
state=selectLinkedPanelV49(state,second,{source:'3d'});assert.equal(state.linkedV49.selectedPanelId,second);assert.equal(state.reviewV35.selectedPanelId,second);assert.equal(state.reviewV35.lastSelectionSource,'3d');assert.equal(state.editorV33.focusPanelId,second);assert.equal(state.markEditorPanelId,second);
state=selectLinkedPanelV49(state,first,{source:'2d'});assert.equal(state.linkedV49.selectedPanelId,first);assert.equal(state.reviewV35.selectedPanelId,first);assert.equal(state.reviewV35.lastSelectionSource,'2d');

state=setLinkedFoldProgressV49(state,50);assert.equal(state.foldProgress,50);assert.equal(state.linkedV49.lastFoldProgress,50);state=setLinkedFoldProgressV49(state,-9);assert.equal(state.foldProgress,0);state=setLinkedFoldProgressV49(state,130);assert.equal(state.foldProgress,100);
const before=state.linkedV49.selectedPanelId;state=cycleLinkedPanelV49(state,1);assert.notEqual(state.linkedV49.selectedPanelId,before);state=cycleLinkedPanelV49(state,-1);assert.equal(state.linkedV49.selectedPanelId,before);
assert.deepEqual(V49_FOLD_PRESETS.map(x=>x.progress),[0,25,50,75,100]);
model=buildLinkedWorkspaceModelV49(state);const selected=model.records.find(r=>r.panelId===state.linkedV49.selectedPanelId);assert.ok(selected);assert.ok(Number.isFinite(selected.bounds.w)&&Number.isFinite(selected.bounds.h));assert.ok(selected.hinges>=0);assert.ok(selected.artworkCount>=0);

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.49'));assert.ok(index.includes('v49Ui.css'));assert.ok(index.includes('v49Ui.js'));
const ui=await readFile(new URL('../src/v49Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('点击 2D 或 3D 面板双向联动'));assert.ok(ui.includes('onSelectPanel'));assert.ok(ui.includes('boxstudio:v49-panel-selection'));assert.ok(ui.includes('开合动画'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.49.0');assert.equal(pkg.scripts['test:v49'],'node tests/v49.mjs');
console.log(`BoxStudio V0.49 linked workspace passed: templates=${templates.length} panels=${model.stats.panels} hinges=${model.stats.hinges}`);
