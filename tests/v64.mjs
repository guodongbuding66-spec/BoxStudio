import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { V64_PRODUCT_VERSION,V64_RETIREMENT_POLICY,runtimeAcceptanceV64 } from '../src/runtimeV64.js';

assert.equal(V64_PRODUCT_VERSION,'V0.64');
const acceptance=runtimeAcceptanceV64();assert.equal(acceptance.ok,true,JSON.stringify(acceptance));
assert.equal(V64_RETIREMENT_POLICY.suppressLegacyNavigation,true);
assert.equal(V64_RETIREMENT_POLICY.suppressLegacyArtworkCallout,true);
assert.deepEqual(V64_RETIREMENT_POLICY.sharedObserverModules,['v58','v59','v60','v61','v62','v63','v64']);
for(const selector of ['.v58-quicknav','[data-v58-context]','[data-v59-guided]','[data-v60-artwork-callout]'])assert.ok(V64_RETIREMENT_POLICY.retiredSelectors.includes(selector));
for(const capability of ['shipping-mark-studio','template-studio','live-mini-3d','image-artwork','artwork-workspace','print-readiness','unified-stagebar','advanced-production-toggle'])assert.ok(V64_RETIREMENT_POLICY.preservedCapabilities.includes(capability));

const runtime=await readFile(new URL('../src/uiRuntimeV64.js',import.meta.url),'utf8');assert.equal((runtime.match(/new MutationObserver/g)||[]).length,1,'V0.64 runtime must own exactly one shared MutationObserver');for(const token of ['callbacks=new Map','register(name,fn)','observerCount:observer?1:0','mutationBatches','runtimeAcceptanceV64'])assert.ok(runtime.includes(token),`Runtime missing ${token}`);
for(const version of [58,59,60,61,62,63]){const ui=await readFile(new URL(`../src/v${version}Ui.js`,import.meta.url),'utf8');assert.ok(ui.includes(`v64Runtime?.register`),`V${version} did not register with shared runtime`)}
const v58=await readFile(new URL('../src/v58Ui.js',import.meta.url),'utf8');for(const token of ['legacyNavRetired','SHIPPING MARK STUDIO','LIVE 3D','syncAdvancedState'])assert.ok(v58.includes(token),`V58 compatibility missing ${token}`);
const v59=await readFile(new URL('../src/v59Ui.js',import.meta.url),'utf8');for(const token of ['legacyNavRetired','DIELINE PREVIEW','data-v59-mode','data-v59-marks-steps'])assert.ok(v59.includes(token),`V59 compatibility missing ${token}`);
const v60=await readFile(new URL('../src/v60Ui.js',import.meta.url),'utf8');assert.ok(v60.includes('suppressLegacyArtworkCallout'));assert.ok(v60.includes('v60ArtworkFile'));
const v64=await readFile(new URL('../src/v64Ui.js',import.meta.url),'utf8');for(const token of ['retireLegacySurfaces','data-v64-production','getRuntimeStats'])assert.ok(v64.includes(token),`V64 UI missing ${token}`);
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');const titleVersion=Number(index.match(/BoxStudio V0\.(\d+)/)?.[1]||0);assert.ok(titleVersion>=64,`Expected product title >= V0.64, got ${titleVersion}`);const runtimePos=index.indexOf('uiRuntimeV64.js'),v58Pos=index.indexOf('v58Ui.js'),v64Pos=index.indexOf('v64Ui.js');assert.ok(runtimePos>0&&runtimePos<v58Pos,'Shared runtime must load before V58');assert.ok(v64Pos>index.indexOf('v63Ui.js'),'V64 shell must load after V63');assert.ok(index.includes('v64Ui.css'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));const [major,minor]=String(pkg.version).split('.').map(Number);assert.ok(major>0||minor>=64,`Expected package version >=0.64, got ${pkg.version}`);assert.equal(pkg.scripts['test:v64'],'node tests/v64.mjs');
console.log(`BoxStudio V0.64 legacy retirement passed: retired=${acceptance.retired} sharedModules=${acceptance.sharedModules} preserved=${acceptance.preserved} package=${pkg.version}`);
