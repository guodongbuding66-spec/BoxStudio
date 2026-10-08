import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { V65_PRODUCT_VERSION,V65_SHARED_OBSERVER_MODULES,V65_MANUFACTURING_CHAIN,V65_VISUAL_SURFACES,V65_PRESERVED_CAPABILITIES,runtimeAcceptanceV65 } from '../src/runtimeV65.js';

assert.equal(V65_PRODUCT_VERSION,'V0.65');
assert.deepEqual(V65_MANUFACTURING_CHAIN,['v55','v56','v57']);
assert.equal(V65_SHARED_OBSERVER_MODULES.length,11);
assert.equal(V65_VISUAL_SURFACES.length,11);
assert.ok(V65_PRESERVED_CAPABILITIES.includes('factory-routing'));
assert.equal(runtimeAcceptanceV65().ok,true);

const runtime=await readFile(new URL('../src/uiRuntimeV64.js',import.meta.url),'utf8');
assert.equal((runtime.match(/new MutationObserver/g)||[]).length,1,'Shared runtime must still own exactly one observer');
for(const version of [55,56,57]){const ui=await readFile(new URL(`../src/v${version}Ui.js`,import.meta.url),'utf8');assert.ok(ui.includes(`v64Runtime.register('v${version}'`),`V${version} did not join shared runtime`);assert.ok(ui.includes('else{new MutationObserver(schedule)'),`V${version} lost standalone compatibility fallback`)}
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
const runtimePos=index.indexOf('uiRuntimeV64.js'),v55Pos=index.indexOf('v55Ui.js'),v65Pos=index.indexOf('v65Ui.js');
assert.ok(runtimePos>0&&runtimePos<v55Pos,'Shared runtime must load before V55');
assert.ok(v65Pos>index.indexOf('v64Ui.js'),'V65 shell must load after V64');
assert.match(index,/BoxStudio V0\.(65|66|67)/);assert.ok(index.includes('v65Ui.css'));
const shell=await readFile(new URL('../src/v65Ui.js',import.meta.url),'utf8');for(const token of ['data-v65-version','runtimeAcceptanceV65','getRuntimeStats'])assert.ok(shell.includes(token),`V65 shell missing ${token}`);
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.ok(Number(pkg.version.split('.')[1])>=65);assert.equal(pkg.scripts['test:v65'],'node tests/v65.mjs');
console.log(`BoxStudio V0.65 manufacturing runtime consolidation passed: shared=${V65_SHARED_OBSERVER_MODULES.length} manufacturing=${V65_MANUFACTURING_CHAIN.length} visual=${V65_VISUAL_SURFACES.length} package=${pkg.version}`);
