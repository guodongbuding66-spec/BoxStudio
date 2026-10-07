import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState,stateForTemplate } from '../src/model.js';
import { buildLinkedWorkspaceModelV49 } from '../src/linkedWorkspaceV49.js';
import { buildBleedContinuityReport,continuitySummary } from '../src/bleedContinuity.js';
import { V62_PRODUCT_VERSION,V62_GUIDE_DEFAULTS,normalizeGuidePrefsV62,printablePanelsV62,panelGuideGeometryV62,buildPrintGuideModelV62,printGuideAcceptanceV62 } from '../src/printGuidesV62.js';

const makeState=id=>{const p=stateForTemplate(id,defaultState.variables),s=structuredClone(defaultState);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;s.selectedId=p.selectedId;s.page='editor';s.editorTab='Design';return s};

assert.equal(V62_PRODUCT_VERSION,'V0.62');
assert.equal(printGuideAcceptanceV62().ok,true);
assert.deepEqual(normalizeGuidePrefsV62({safe:false}),{...V62_GUIDE_DEFAULTS,safe:false});
const fake=panelGuideGeometryV62({id:'front',x:10,y:20,w:100,h:60},{safeMm:5,bleedMm:3});
assert.deepEqual(fake.safe,{x:15,y:25,w:90,h:50,insetMm:5});
assert.deepEqual(fake.bleed,{x:7,y:17,w:106,h:66,outsetMm:3});

const TEMPLATES=['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','fefco-0203','straight-tuck-end','sleeve-carton'];
let routed=0,totalPanels=0;
for(const id of TEMPLATES){
  const state=makeState(id),linked=buildLinkedWorkspaceModelV49(state),geo=linked.review.geo;
  const panels=printablePanelsV62(geo),model=buildPrintGuideModelV62(state,geo,{bleed:true,safe:true,panels:true,cut:true,crease:true});
  assert.ok(panels.length>0,`${id}: no printable panels`);
  assert.equal(model.panels.length,panels.length,`${id}: panel mapping drift`);
  assert.equal(model.safeZones.length,panels.length,`${id}: safe zones missing`);
  assert.equal(model.bleedZones.length,panels.length,`${id}: bleed zones missing`);
  assert.equal(model.cutLines.length,(geo.cutLines||[]).length,`${id}: CUT count mismatch`);
  assert.equal(model.creaseLines.length,(geo.creaseLines||[]).length,`${id}: CREASE count mismatch`);
  assert.equal(model.safeMm,Number(state.structure.safe));
  assert.equal(model.bleedMm,Number(state.structure.bleed));
  const seams=continuitySummary(buildBleedContinuityReport(state,geo,linked.review.graph));
  assert.ok(seams.total>=0&&seams.warnings>=0,`${id}: seam report invalid`);
  routed++;totalPanels+=panels.length;
}
const off=buildPrintGuideModelV62(makeState('fefco-0427'),buildLinkedWorkspaceModelV49(makeState('fefco-0427')).review.geo,{bleed:false,safe:false,panels:false,cut:false,crease:false});
assert.equal(off.safeZones.length,0);assert.equal(off.bleedZones.length,0);assert.equal(off.cutLines.length,0);assert.equal(off.creaseLines.length,0);

const ui=await readFile(new URL('../src/v62Ui.js',import.meta.url),'utf8');
for(const token of ['PRINT READINESS','2D 印刷辅助','完整 3D / 折叠动画','Preflight / Production PDF','buildBleedContinuityReport'])assert.ok(ui.includes(token),`V0.62 UI missing ${token}`);
const css=await readFile(new URL('../src/v62Ui.css',import.meta.url),'utf8');
for(const token of ['v62-readiness','v62-bleed-zone','v62-safe-zone','@media(max-width:760px)'])assert.ok(css.includes(token),`V0.62 CSS missing ${token}`);
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(index.includes('BoxStudio V0.62'));assert.ok(index.includes('v62Ui.css'));assert.ok(index.includes('v62Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(pkg.version,'0.62.0');assert.equal(pkg.scripts['test:v62'],'node tests/v62.mjs');

console.log(`BoxStudio V0.62 print readiness passed: templates=${routed} panels=${totalPanels}`);
