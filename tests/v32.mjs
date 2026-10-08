import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TEMPLATE_DEFAULTS, defaultsForTemplate, generateGeometry, manufacturingDimensions } from '../src/geometry.js';
import { STANDARD_TEMPLATE_CATALOG, searchTemplateCatalog } from '../src/templates.js';
import { V32_TEMPLATE_CATALOG, resolveBoxDimensionsV32, previewSvgForGeometryV32 } from '../src/parametricTemplatesV32.js';
import { FLUTE_PRESETS_V32, MATERIAL_PRESETS_V32, resolveMaterialV32, validateMaterialV32 } from '../src/materialsV32.js';
import { STORAGE_KEY, LEGACY_STORAGE_KEYS, stateForTemplate } from '../src/model.js';

const IDS=['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom'];
assert.deepEqual(V32_TEMPLATE_CATALOG.map(x=>x.id),IDS);
const actionable=STANDARD_TEMPLATE_CATALOG.filter(x=>x.engine);
const actionableIds=actionable.map(x=>x.id);
assert.ok(IDS.every(id=>actionableIds.includes(id)),'All V0.32 baseline templates must remain actionable in later catalogs.');
assert.equal(actionable.filter(x=>IDS.includes(x.id)).every(x=>x.engine===x.id),true);
assert.ok(STANDARD_TEMPLATE_CATALOG.some(x=>x.id==='fefco-04xx-schema'&&x.status==='schema-only'));
assert.ok(STANDARD_TEMPLATE_CATALOG.some(x=>x.id==='ecma-schema'&&x.status==='schema-only'));
assert.equal(searchTemplateCatalog({query:'0427'}).filter(x=>x.id==='fefco-0427').length,1);
assert.equal(searchTemplateCatalog({query:'crash lock'})[0]?.id,'auto-lock-bottom');
const foldingCartons=searchTemplateCatalog({category:'folding-carton'});assert.ok(['reverse-tuck-end','auto-lock-bottom'].every(id=>foldingCartons.some(x=>x.id===id)));
const fefcoTemplates=searchTemplateCatalog({standard:'FEFCO'}).filter(x=>x.engine);assert.ok(['side-seal-rsc','fefco-0427'].every(id=>fefcoTemplates.some(x=>x.id===id)));

assert.ok(MATERIAL_PRESETS_V32.length>=5);
assert.ok(Object.keys(FLUTE_PRESETS_V32).includes('BC'));
assert.equal(resolveMaterialV32({materialId:'corrugated-white',flute:'BC'}).thicknessMm,7);
assert.equal(validateMaterialV32({materialId:'corrugated-white',flute:'E'}).ok,true);
assert.equal(resolveMaterialV32({materialId:'sbs-paperboard'}).category,'paperboard');

const geometryById={};
for(const id of IDS){
  assert.ok(TEMPLATE_DEFAULTS[id],`${id} must have defaults`);
  const s=defaultsForTemplate(id),g=generateGeometry(s);geometryById[id]=g;
  assert.equal(g.template,id,`${id} template identity must survive geometry dispatch`);
  assert.ok(g.width>0&&g.height>0,`${id} document bounds required`);
  assert.ok(g.bodyPanels?.length>0,`${id} body panels required`);
  assert.ok(g.cutLines?.length>0,`${id} cut geometry required`);
  assert.ok(g.creaseLines?.length>0,`${id} crease geometry required`);
  assert.ok(g.panelMap&&Object.keys(g.panelMap).length===g.panels.length,`${id} panel map must cover all panels`);
  assert.ok(Array.isArray(g.bleedRects)&&Array.isArray(g.safeRects),`${id} guide geometry required`);
  assert.equal(JSON.stringify(generateGeometry(s)),JSON.stringify(generateGeometry(structuredClone(s))),`${id} geometry must be deterministic`);
  const state=stateForTemplate(id),stateGeo=generateGeometry(state.structure);
  for(const el of state.elements)assert.ok(stateGeo.panelMap[el.panelId],`${id} element ${el.id} targets missing panel ${el.panelId}`);
}

assert.equal(geometryById['side-seal-rsc'].documentTitle,'US Side-Seal Carton / RSC Parametric Base');
assert.equal(geometryById['mailer-150010'].reference.designArea,'576×590 mm');

for(const id of ['fefco-0427','reverse-tuck-end','auto-lock-bottom']){
  const g=geometryById[id];
  assert.equal(g.validationState,'engineering-core-pending-real-sample');
  assert.ok(g.engineeringNotes.length>=1);
}
assert.ok(geometryById['fefco-0427'].panels.length>=15,'0427 must model roll walls/tabs, not a static rectangle');
assert.ok(geometryById['reverse-tuck-end'].flapPanels.some(x=>x.id==='top-front-tuck'));
assert.ok(geometryById['reverse-tuck-end'].flapPanels.some(x=>x.id==='bottom-back-tuck'));
assert.ok(geometryById['auto-lock-bottom'].creaseLines.some(l=>l.x1!==l.x2&&l.y1!==l.y2),'auto-lock requires diagonal pre-folds');

for(const id of ['fefco-0427','reverse-tuck-end','auto-lock-bottom']){
  const a=defaultsForTemplate(id),g1=generateGeometry(a),g2=generateGeometry({...a,length:a.length+37,width:a.width+19,height:a.height+11});
  assert.notEqual(g1.width,g2.width,`${id} width must recompute from parameters`);
  assert.notEqual(g1.height,g2.height,`${id} height must recompute from parameters`);
  assert.notDeepEqual(g1.cutLines,g2.cutLines,`${id} cut lines must recompute`);
}

for(const id of ['fefco-0427','reverse-tuck-end','auto-lock-bottom']){
  const a=defaultsForTemplate(id),thin=manufacturingDimensions({...a,thickness:0.5}),thick=manufacturingDimensions({...a,thickness:4});
  assert.ok(thick.L>thin.L||thick.W>thin.W||thick.H>thin.H,`${id} thickness must affect compensated dimensions`);
}

const common={length:300,width:200,height:70,thickness:3,materialId:'corrugated-white',flute:'B',compensation:true};
const internal=resolveBoxDimensionsV32({...common,sizeType:'internal'}),external=resolveBoxDimensionsV32({...common,sizeType:'external'}),manufacturing=resolveBoxDimensionsV32({...common,sizeType:'manufacturing'});
assert.deepEqual(internal.inside,{L:300,W:200,H:70});
assert.deepEqual(external.external,{L:300,W:200,H:70});
assert.deepEqual(manufacturing.manufacturing,{L:300,W:200,H:70});
assert.ok(internal.manufacturing.L>internal.inside.L);
assert.ok(external.inside.L<external.external.L);
assert.ok(manufacturing.inside.L<manufacturing.manufacturing.L);

const preview=previewSvgForGeometryV32(geometryById['fefco-0427']);
assert.ok(preview.includes('<svg'));
assert.ok(preview.includes('class="cut"'));
assert.ok(preview.includes('class="crease"'));

assert.equal(STORAGE_KEY,'boxstudio-mvp-v32');
assert.ok(LEGACY_STORAGE_KEYS.includes('boxstudio-mvp-v31'));
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(/BoxStudio V0\.(?:3[2-9]|[4-9]\d)/.test(index),'V0.32 or later shell required');
assert.ok(index.includes('v32Ui.css'));
assert.ok(index.includes('v32Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.ok(Number(pkg.version.split('.')[1])>=32,'current package must be V0.32 or later');
console.log('BoxStudio V0.32 parametric template core tests passed');