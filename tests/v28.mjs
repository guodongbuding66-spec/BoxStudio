import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../src/model.js';
import { liveGroupRotationAssistV28, groupRotationDiagnosticsV28 } from '../src/liveAssistV28.js';
import { rotateCrossSelection } from '../src/crossPanelTransformV22.js';

const state=structuredClone(defaultState);
state.elements=[
  {id:'a',type:'cross-panel-artwork',x:0,y:0,w:20,h:20,r:10},
  {id:'b',type:'cross-panel-artwork',x:40,y:0,w:20,h:20,r:40},
  {id:'target',type:'cross-panel-artwork',x:100,y:0,w:20,h:20,r:50},
];
state.crossPanelEdit={...(state.crossPanelEdit||{}),selection:['a','b'],angleStep:15,rotationGuideToleranceDeg:3};

const match=liveGroupRotationAssistV28(state,['a','b'],38,{enabled:true,toleranceDeg:3,step:15});
assert.equal(match.delta,40,'group rotation should match selected member A to target rotation');
assert.equal(match.guides[0]?.kind,'group-rotation-match');
assert.equal(match.guides[0]?.sourceId,'a');
assert.equal(match.guides[0]?.targetId,'target');

const rotated=rotateCrossSelection(state,['a','b'],match.delta,{origin:{x:30,y:10},snap:false});
assert.equal(rotated.elements.find(e=>e.id==='a').r,50);
assert.equal(rotated.elements.find(e=>e.id==='b').r,80);
assert.equal(rotated.elements.find(e=>e.id==='target').r,50,'unselected target must remain unchanged');

const tieState={elements:[{id:'a',type:'cross-panel-artwork',r:0},{id:'b',type:'cross-panel-artwork',r:15},{id:'target',type:'cross-panel-artwork',r:30}]};
const tie=liveGroupRotationAssistV28(tieState,['a','b'],29,{enabled:true,toleranceDeg:2,step:15});
assert.equal(tie.delta,30);
assert.equal(tie.guides[0]?.kind,'group-rotation-match','object-relative target should win a tie against the plain angle grid');

const axisState={elements:[{id:'a',type:'cross-panel-artwork',r:10},{id:'b',type:'cross-panel-artwork',r:20},{id:'target',type:'cross-panel-artwork',r:30}]};
const axis=liveGroupRotationAssistV28(axisState,['a','b'],108,{enabled:true,toleranceDeg:3,step:15,includeOrthogonal:true});
assert.equal(axis.delta,110);
assert.equal(axis.guides[0]?.kind,'group-rotation-axis');
assert.equal(axis.guides[0]?.offset,90);

const raw=liveGroupRotationAssistV28(state,['a','b'],37.25,{enabled:false,toleranceDeg:3,step:15});
assert.equal(raw.delta,37.25);
assert.deepEqual(raw.guides,[]);

const diag=groupRotationDiagnosticsV28(state,['a','b']);
assert.deepEqual(diag,{selectionCount:2,targetCount:1,objectRelativeAvailable:true});
assert.ok(STORAGE_KEY.startsWith('boxstudio-mvp-v'));
assert.ok(STORAGE_KEY==='boxstudio-mvp-v28'||LEGACY_STORAGE_KEYS.includes('boxstudio-mvp-v28'),'V0.28 state must remain a supported migration source after later releases');
assert.equal(defaultState.exportOptions.productionSerializer,'v0.27-native-cubic-production','V0.28 editor assist must not silently change the approved production serializer');

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(index.includes('v28GroupRotationPatch.js'));
assert.ok(index.includes('v28Ui.js'));
const audit=await readFile(new URL('../docs/UNFINISHED_BASELINE_AUDIT.md',import.meta.url),'utf8');
assert.ok(audit.includes('V3.0 Phase 1'));
assert.ok(audit.includes('Barcode / QR Digital Decode'));
assert.ok(audit.includes('Hosted Backend'));
assert.ok(audit.includes('Browser Interaction E2E'));

console.log('BoxStudio V0.28 tests passed');
