import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState,stateForTemplate } from '../src/model.js';
import { V63_PRODUCT_VERSION,V63_STAGES,stageForTabV63,nextStageV63,preflightSummaryV63,selectedContextV63,workspaceSummaryV63,studioShellAcceptanceV63 } from '../src/studioShellV63.js';

const makeState=id=>{const p=stateForTemplate(id,defaultState.variables),s=structuredClone(defaultState);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;s.selectedId=p.selectedId;s.page='editor';s.editorTab='Design';return s};
assert.equal(V63_PRODUCT_VERSION,'V0.63');
assert.equal(V63_STAGES.length,6);assert.equal(new Set(V63_STAGES.map(x=>x.id)).size,6);
assert.equal(stageForTabV63('3D').id,'proof');assert.equal(nextStageV63('Design').tab,'Marks');assert.equal(nextStageV63('Export').tab,'Export');
assert.deepEqual(preflightSummaryV63([{severity:'pass'},{severity:'warning'},{severity:'error'}]),{pass:1,warning:1,error:1,total:3,ready:false});
const fakeContext=selectedContextV63({selectedId:'logo',elements:[{id:'logo',type:'image',panelId:'front',w:30,h:20,r:0}]},{panelMap:{front:{id:'front',label:'FRONT',w:100,h:80}}});
assert.equal(fakeContext.typeLabel,'图片 / Logo');assert.equal(fakeContext.panelLabel,'FRONT');assert.equal(fakeContext.objectSize.w,30);

const TEMPLATES=['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','fefco-0203','straight-tuck-end','sleeve-carton'];
let routed=0,totalPanels=0,totalChecks=0;
for(const id of TEMPLATES){const state=makeState(id),summary=workspaceSummaryV63(state),accept=studioShellAcceptanceV63(state);assert.equal(accept.ok,true,`${id}: shell acceptance failed ${accept.error||''}`);assert.ok(summary.panels>0,`${id}: no panels`);assert.ok(summary.preflight.total>0,`${id}: no preflight checks`);assert.ok(Number.isFinite(summary.artwork.images)&&Number.isFinite(summary.artwork.marks));assert.equal(summary.stage.id,'artwork');routed++;totalPanels+=summary.panels;totalChecks+=summary.preflight.total}

const ui=await readFile(new URL('../src/v63Ui.js',import.meta.url),'utf8');for(const token of ['v63-stagebar','CONTEXT','data-v63-advanced','v60ArtworkFile','workspaceSummaryV63'])assert.ok(ui.includes(token),`V0.63 UI missing ${token}`);
const css=await readFile(new URL('../src/v63Ui.css',import.meta.url),'utf8');for(const token of ['v58-quicknav','v58-contextbar','v63-secondary-panel','data-v63-image','@media(max-width:760px)'])assert.ok(css.includes(token),`V0.63 CSS missing ${token}`);
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(/BoxStudio V0\.(?:6[3-9]|[7-9]\d|\d{3,})/.test(index),`Expected product title >= V0.63`);assert.ok(index.includes('v63Ui.css'));assert.ok(index.includes('v63Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));const [major,minor]=pkg.version.split('.').map(Number);assert.ok(major>0||minor>=63,`Expected package version >= 0.63.0, got ${pkg.version}`);assert.equal(pkg.scripts['test:v63'],'node tests/v63.mjs');
console.log(`BoxStudio V0.63 studio consolidation passed: templates=${routed} panels=${totalPanels} preflightChecks=${totalChecks} package=${pkg.version}`);
