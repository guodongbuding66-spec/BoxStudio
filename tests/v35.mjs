import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { buildFoldGraph } from '../src/foldgraph.js';
import {
  V35_REVIEW_SCHEMA, ensureReviewStateV35, selectReviewPanelV35, selectReviewElementV35,
  patchReviewElementV35, setReviewMaterialV35, setReviewFoldProgressV35, buildReviewModelV35,
  buildFoldDiagnosticsV35, resolveMaterialVisualV35, materialCatalogV35
} from '../src/threeReviewV35.js';

let state=ensureReviewStateV35(structuredClone(defaultState));
assert.equal(state.reviewV35.schema,V35_REVIEW_SCHEMA);
assert.equal(state.reviewV35.selectedPanelId,'front');
assert.equal(state.reviewV35.syncEnabled,true);

const geo=generateGeometry(state.structure),graph=buildFoldGraph(geo),diagnostics=buildFoldDiagnosticsV35(graph);
assert.equal(diagnostics.ok,true,'default RSC fold graph should be structurally valid');
assert.ok(diagnostics.sequence.length>0);
assert.equal(diagnostics.sequence.length,graph.edges.length);
assert.ok(diagnostics.sequence.some(step=>step.angle>0));
assert.ok(diagnostics.sequence.some(step=>step.angle<0));
assert.ok(diagnostics.sequence.every(step=>['positive','negative','flat'].includes(step.direction)));

// 3D face selection becomes authoritative 2D panel focus.
state=selectReviewPanelV35(state,'back',{source:'3d'});
assert.equal(state.reviewV35.selectedPanelId,'back');
assert.equal(state.reviewV35.lastSelectionSource,'3d');
assert.equal(state.editorV33.focusPanelId,'back');
assert.equal(state.editorV33.fitMode,'panel');
assert.equal(state.markEditorPanelId,'back');

// 2D object selection carries its panel into the linked review state and V0.33 selection model.
state=selectReviewElementV35(state,'origin',{source:'2d'});
assert.equal(state.reviewV35.selectedPanelId,'back');
assert.equal(state.reviewV35.selectedElementId,'origin');
assert.equal(state.selectedId,'origin');
assert.deepEqual(state.editorV33.selection,['origin']);

const beforeRevision=state.reviewV35.liveRevision;
state=patchReviewElementV35(state,{x:81.5,r:7.5,template:'ORIGIN: {{originCountry}}'});
const origin=state.elements.find(element=>element.id==='origin');
assert.equal(origin.x,81.5);assert.equal(origin.r,7.5);assert.equal(origin.template,'ORIGIN: {{originCountry}}');
assert.equal(state.reviewV35.liveRevision,beforeRevision+1);

// Material/flute/thickness feeds a visual board model instead of being a cosmetic dropdown only.
state=setReviewMaterialV35(state,{materialId:'corrugated-kraft',flute:'B',thickness:''});
let material=resolveMaterialVisualV35(state.structure);
assert.equal(material.materialId,'corrugated-kraft');assert.equal(material.flute,'B');assert.equal(material.thicknessMm,3);
assert.equal(material.appearance,'kraft');assert.ok(material.edgePreviewPx>1);
state=setReviewMaterialV35(state,{thickness:2.35});material=resolveMaterialVisualV35(state.structure);assert.equal(material.thicknessMm,2.35);assert.equal(material.source,'explicit');
assert.ok(materialCatalogV35().some(item=>item.id==='sbs-paperboard'));

state=setReviewFoldProgressV35(state,43);assert.equal(state.foldProgress,43);
state=setReviewFoldProgressV35(state,140);assert.equal(state.foldProgress,100);
state=setReviewFoldProgressV35(state,-4);assert.equal(state.foldProgress,0);

const model=buildReviewModelV35(state);
assert.equal(model.selectedPanelId,'back');assert.equal(model.selectedElement.id,'origin');assert.equal(model.stats.panels,graph.nodes.length);assert.equal(model.stats.liveRevision,state.reviewV35.liveRevision);
assert.ok(model.panelElements.some(element=>element.id==='origin'));

// Diagnostics must fail closed on topology defects rather than presenting a plausible sequence.
const hinge={x1:0,y1:0,x2:1,y2:0};
const broken={root:'a',nodes:[{id:'a'},{id:'b'}],edges:[{from:'a',to:'b',angle:90,hinge},{from:'b',to:'a',angle:-90,hinge}]};
const brokenReport=buildFoldDiagnosticsV35(broken);assert.equal(brokenReport.ok,false);assert.equal(brokenReport.cycle,true);assert.ok(brokenReport.issues.some(issue=>issue.code==='CYCLE'));
const missingHinge=buildFoldDiagnosticsV35({root:'a',nodes:[{id:'a'},{id:'b'}],edges:[{from:'a',to:'b',angle:90}]});assert.equal(missingHinge.ok,false);assert.ok(missingHinge.issues.some(issue=>issue.code==='HINGE_MISSING'));

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.35'));assert.ok(index.includes('v35Ui.css'));assert.ok(index.includes('v35Ui.js'));
const ui=await readFile(new URL('../src/v35Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('2D ↔ 3D Review'));assert.ok(ui.includes('Fold Direction / Dependency Order'));assert.ok(ui.includes('Graph-derived review sequence, not a factory machine program.'));
const proof=await readFile(new URL('../src/threeArtworkProof.js',import.meta.url),'utf8');assert.ok(proof.includes('onSelectPanel'));assert.ok(proof.includes('setSelectedPanel'));assert.ok(proof.includes('materialStyle'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.35.0');
console.log('BoxStudio V0.35 2D-3D linked review tests passed');
