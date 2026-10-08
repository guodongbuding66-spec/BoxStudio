import assert from 'node:assert/strict';
import { V48_TEMPLATE_CATALOG, generateAdditionalTemplateV48, dimensionSetForTemplateV48 } from '../src/parametricTemplatesV48.js';
import { STANDARD_TEMPLATE_CATALOG } from '../src/templates.js';
import { defaultsForTemplate, generateGeometry } from '../src/geometry.js';
import { defaultState, stateForTemplate } from '../src/model.js';
import { actionableTemplatesV47, sanitizeQuickSizeV47, prepareTemplateStateV47 } from '../src/productExperienceV47.js';
import { dielineDocumentFromStateV38 } from '../src/dielineCadV38.js';
import { buildStructuralTopologyV39 } from '../src/structuralTopologyV39.js';
import { buildFoldGraph, graphStats } from '../src/foldgraph.js';

const clone=v=>structuredClone(v);
const ids=['fefco-0203','straight-tuck-end','sleeve-carton'];
assert.deepEqual(V48_TEMPLATE_CATALOG.map(x=>x.id),ids);
assert.ok(ids.every(id=>STANDARD_TEMPLATE_CATALOG.some(t=>t.id===id&&t.engine)));
assert.ok(actionableTemplatesV47().length>=8,'The original eight engines must remain available as the catalog grows.');

const kraftB=sanitizeQuickSizeV47({length:400,width:300,height:250,materialId:'corrugated-kraft',flute:'B'});
assert.equal(kraftB.thickness,3,'B flute quick-start must resolve to 3.0 mm instead of the old fixed 1.5 mm.');
const customThickness=sanitizeQuickSizeV47({materialId:'corrugated-kraft',flute:'B',thickness:2.7});
assert.equal(customThickness.thickness,2.7,'Explicit board thickness must override the engineering flute preset.');

const ext=dimensionSetForTemplateV48('fefco-0203',{length:400,width:300,height:250,sizeType:'external',materialId:'corrugated-kraft',flute:'B',thickness:3});
assert.equal(ext.external.L,400);assert.equal(ext.external.W,300);assert.equal(ext.external.H,250);
assert.equal(ext.inside.L,394);assert.equal(ext.inside.W,294);assert.equal(ext.inside.H,244);
assert.ok(ext.manufacturing.L>ext.inside.L&&ext.manufacturing.H>ext.inside.H);

for(const id of ids){
  const defaults=defaultsForTemplate(id);assert.equal(defaults.template,id,`${id} defaults must not fall back to RSC.`);
  const direct=generateAdditionalTemplateV48(defaults),geo=generateGeometry(defaults);
  assert.equal(direct.template,id);assert.equal(geo.template,id);
  assert.ok(geo.panels.length>=5,`${id} needs semantic panels.`);
  assert.ok(geo.cutLines.length>=4,`${id} needs production CUT geometry.`);
  assert.ok(geo.creaseLines.length>=4,`${id} needs fold/crease geometry.`);
  assert.ok(geo.panelMap.front&&geo.panelMap.back,`${id} must retain front/back panel identity.`);

  const seed=clone(defaultState),preset=stateForTemplate(id,seed.variables);
  seed.structure=preset.structure;seed.elements=preset.elements;seed.variables=preset.variables;seed.selectedId=preset.selectedId;
  const doc=dielineDocumentFromStateV38(seed),topology=buildStructuralTopologyV39(seed,{doc});
  assert.equal(topology.ok,true,`${id} 2D → topology failed: ${JSON.stringify(topology.errors)}`);
  assert.ok(topology.graph.nodes.length>=4,`${id} topology must contain foldable panels.`);
  const graph=buildFoldGraph(geo),stats=graphStats(graph);
  assert.ok(stats.panels>=4,`${id} 3D FoldGraph lost panel identity.`);
  assert.ok(stats.hinges>=3,`${id} 3D FoldGraph lost fold hinges.`);
}

const overlap=generateGeometry(defaultsForTemplate('fefco-0203'));
assert.equal(overlap.flapPanels.filter(p=>p.role==='major-full-overlap').length,4);
assert.ok(overlap.flapPanels.filter(p=>p.role==='major-full-overlap').every(p=>p.h>=overlap.dimensionSet.manufacturing.W-.001));
const ste=generateGeometry(defaultsForTemplate('straight-tuck-end'));
assert.equal(ste.panelMap['top-front-tuck'].parent,'front');assert.equal(ste.panelMap['bottom-front-tuck'].parent,'front');
const sleeve=generateGeometry(defaultsForTemplate('sleeve-carton'));
assert.equal(sleeve.flapPanels.length,0);assert.match(sleeve.documentTitle,/Sleeve/);

const started=prepareTemplateStateV47(defaultState,'fefco-0203',{length:520,width:360,height:280,sizeType:'internal',materialId:'corrugated-kraft',flute:'B'});
assert.equal(started.structure.template,'fefco-0203');assert.equal(started.structure.thickness,3);assert.equal(started.page,'editor');assert.equal(started.editorTab,'Structure');

console.log(`BoxStudio V0.48 templates passed: engines=${ids.length} actionable=${actionableTemplatesV47().length} B-flute=${kraftB.thickness}mm`);
