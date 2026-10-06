import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateParametricGeometryV32, resolveBoxDimensionsV32, V32_TEMPLATE_CATALOG } from '../src/parametricTemplatesV32.js';
import { MATERIAL_PRESETS_V32, FLUTE_PRESETS_V32, resolveMaterialV32 } from '../src/materialsV32.js';
import { previewSvgForGeometryV32 } from '../src/templatePreviewV32.js';
import { STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../src/model.js';

assert.equal(V32_TEMPLATE_CATALOG.length,5);
assert.deepEqual(V32_TEMPLATE_CATALOG.map(x=>x.id),['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom']);
for(const record of V32_TEMPLATE_CATALOG){assert.ok(record.engine);assert.ok(record.parameters.length>=4)}

const structures={
  'fefco-0427':{template:'fefco-0427',length:300,width:200,height:70,materialId:'corrugated-white',flute:'E',thickness:1.5,sizeType:'internal',compensation:true},
  'reverse-tuck-end':{template:'reverse-tuck-end',length:120,width:45,height:180,materialId:'sbs-paperboard',thickness:.45,sizeType:'internal',glue:18,compensation:true},
  'auto-lock-bottom':{template:'auto-lock-bottom',length:120,width:45,height:180,materialId:'sbs-paperboard',thickness:.45,sizeType:'internal',glue:18,compensation:true},
};
const geometryById={};
for(const [id,structure] of Object.entries(structures)){
  const geo=generateParametricGeometryV32(structure);geometryById[id]=geo;
  assert.equal(geo.template,id);
  assert.ok(geo.panels.length>=8,`${id} panels`);
  assert.ok(geo.cutLines.length>0,`${id} cuts`);
  assert.ok(geo.creaseLines.length>0,`${id} creases`);
  assert.ok(geo.width>0&&geo.height>0,`${id} document size`);
  assert.ok(geo.dimensionSet?.inside?.L>0,`${id} dimension set`);
  assert.equal(geo.validationState,'engineering-core-pending-real-sample');
}

const f=geometryById['fefco-0427'];
assert.ok(f.panelMap.base);
assert.ok(f.panelMap.lid);
assert.ok(f.panelMap['lid-tuck']);
assert.equal(f.foldRoot,'base');
assert.equal(f.structure.glue,0);

const rte=geometryById['reverse-tuck-end'];
assert.ok(rte.panelMap['top-front-tuck']);
assert.ok(rte.panelMap['bottom-back-tuck']);
assert.ok(rte.glueLines.length>0);

const alb=geometryById['auto-lock-bottom'];
assert.ok(alb.panelMap['bottom-front-major']);
assert.ok(alb.panelMap['bottom-back-major']);
assert.ok(alb.perfLines.length>0);

assert.equal(MATERIAL_PRESETS_V32.length,5);
assert.equal(FLUTE_PRESETS_V32.E.thicknessMm,1.5);
assert.equal(FLUTE_PRESETS_V32.B.thicknessMm,3);
const white=resolveMaterialV32({materialId:'corrugated-white',flute:'E'});
assert.equal(white.flute,'E');
assert.equal(white.thicknessMm,1.5);
const explicit=resolveMaterialV32({materialId:'corrugated-white',flute:'E',thickness:2.1});
assert.equal(explicit.thicknessMm,2.1);
assert.equal(explicit.source,'explicit');

const base={length:300,width:200,height:70,materialId:'corrugated-white',flute:'E',thickness:1.5,compensation:true};
const internal=resolveBoxDimensionsV32({...base,sizeType:'internal'});
const external=resolveBoxDimensionsV32({...base,sizeType:'external'});
const manufacturing=resolveBoxDimensionsV32({...base,sizeType:'manufacturing'});
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
const titleVersion=index.match(/<title>[^<]*?V0\.(\d+)[^<]*<\/title>/i);
assert.ok(titleVersion&&Number(titleVersion[1])>=32,'V0.32 or later shell required');
assert.ok(index.includes('v32Ui.css'));
assert.ok(index.includes('v32Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.ok(Number(pkg.version.split('.')[1])>=32,'current package must be V0.32 or later');
console.log('BoxStudio V0.32 parametric template core tests passed');