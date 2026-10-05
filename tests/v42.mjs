import assert from 'node:assert/strict';
import { defaultsForTemplate, generateGeometry, normalizeStructure } from '../src/geometry.js';

const base0427=defaultsForTemplate('fefco-0427');
const zero0427=generateGeometry(base0427);
const advanced0427=generateGeometry({...base0427,flapTaper:8,notch:6,shoulder:10,relief:4,cornerRadius:3});
assert.equal(advanced0427.advancedV42.flapTaper,8);
assert.equal(advanced0427.advancedV42.notch,6);
assert.equal(advanced0427.advancedV42.shoulder,10);
assert.equal(advanced0427.advancedV42.relief,4);
assert.equal(advanced0427.advancedV42.cornerRadius,3);
assert.equal(advanced0427.advancedV42.cornerRadiusMode,'metadata-only-line-engine');
assert.ok(advanced0427.advancedV42.applied.some(x=>x.panelId==='lid-tuck'));
assert.ok(advanced0427.advancedV42.applied.some(x=>x.kind==='roll-relief'));
assert.equal(advanced0427.panelMap['lid-tuck'].points.length,4);
assert.ok(advanced0427.cutLines.length>zero0427.cutLines.length,'advanced 0427 should emit additional semantic CUT geometry');
assert.ok(advanced0427.engineeringNotes.some(x=>x.includes('not emitted as a production arc')),'corner-radius limitation must remain explicit');

const rteBase=defaultsForTemplate('reverse-tuck-end');
const rte=generateGeometry({...rteBase,flapTaper:4,notch:3,shoulder:5});
assert.equal(rte.panelMap['top-front-tuck'].points.length,4);
assert.equal(rte.panelMap['bottom-back-tuck'].points.length,4);
assert.ok(rte.advancedV42.applied.filter(x=>x.panelId?.includes('tuck')).length>=2);

const autoBase=defaultsForTemplate('auto-lock-bottom');
const auto=generateGeometry({...autoBase,flapTaper:5,notch:4,shoulder:6});
assert.equal(auto.panelMap['top-front-tuck'].points.length,4);
assert.ok(auto.advancedV42.applied.some(x=>x.panelId==='top-front-tuck'));

const clamped=normalizeStructure({...base0427,cornerRadius:999,flapTaper:-4,relief:99,notch:99,shoulder:99});
assert.equal(clamped.cornerRadius,30);
assert.equal(clamped.flapTaper,0);
assert.equal(clamped.relief,20);
assert.equal(clamped.notch,25);
assert.equal(clamped.shoulder,30);

const untouched=generateGeometry(base0427);
assert.equal(untouched.advancedV42.applied.length,0,'zero advanced controls must preserve the stable base geometry');
assert.equal(untouched.advancedV42.cornerRadiusMode,'off');

console.log('BoxStudio V0.42 advanced structure geometry tests passed');
