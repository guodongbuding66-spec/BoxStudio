import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { parseSvgMark, createSvgMarkElement, materializeSvgMarkElement, materializeSvgMarksForProduction } from '../src/svgMark.js';
import { workerBatchEligibility, buildWorkerPdfTask } from '../src/batchWorkerCore.js';
import { analyzeProjectMerge, applyProjectMerge, mergeSummary } from '../src/projectMerge.js';

const svg=`<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="96" height="46"/><path d="M 10 25 C 30 2 70 48 90 25"/><circle cx="50" cy="25" r="8"/></svg>`;
const mark=parseSvgMark(svg,{name:'QA Logo'});
assert.equal(mark.schema,'boxstudio-svg-mark');
assert.ok(mark.segmentCount>50,'curves and circle should be flattened into vector segments');
assert.ok(mark.width>0&&mark.height>0);
assert.throws(()=>parseSvgMark('<svg><script>alert(1)</script><path d="M0 0 L1 1"/></svg>'),/blocked/i);
assert.throws(()=>parseSvgMark('<svg><image href="https://example.com/a.png"/></svg>'),/blocked|external/i);

const element=createSvgMarkElement(mark,{id:'qa-logo',panelId:'front',x:20,y:30,width:100,rotation:90});
const lines=materializeSvgMarkElement(element);
assert.equal(lines.length,mark.segmentCount);
assert.ok(lines.every(line=>line.type==='line'&&line.panelId==='front'));
let state=structuredClone(defaultState);state.elements.push(element);
const materialized=materializeSvgMarksForProduction(state);
assert.equal(materialized.elements.some(item=>item.type==='svg-symbol'),false);
assert.ok(materialized.elements.some(item=>item.svgSourceId==='qa-logo'));

assert.equal(workerBatchEligibility(state).ok,true);
const blocked=structuredClone(state);blocked.exportOptions.outlineText=true;blocked.exportOptions.fontMode='ttf';
assert.equal(workerBatchEligibility(blocked).ok,false);
const task=buildWorkerPdfTask(state,{},0);
assert.equal(task.ok,true,task.error);
assert.ok(task.bytes instanceof Uint8Array);
assert.equal(new TextDecoder().decode(task.bytes.slice(0,5)),'%PDF-');

const base=structuredClone(defaultState),local=structuredClone(base),remote=structuredClone(base);
local.projectName='Local Project';remote.structure.length=Number(remote.structure.length)+10;
let analysis=analyzeProjectMerge({baseState:base,localState:local,remoteState:remote});
let summary=mergeSummary(analysis);
assert.equal(summary.conflicts,0);
assert.equal(summary.localOnly,1);
assert.equal(summary.remoteOnly,1);
let merged=applyProjectMerge(analysis,{localState:local,remoteState:remote});
assert.deepEqual(merged.unresolved,[]);
assert.equal(merged.state.projectName,'Local Project');
assert.equal(merged.state.structure.length,remote.structure.length);

local.variables.sku='LOCAL-SKU';remote.variables.sku='REMOTE-SKU';analysis=analyzeProjectMerge({baseState:base,localState:local,remoteState:remote});
assert.ok(analysis.conflicts.some(entry=>entry.path==='variables'));
merged=applyProjectMerge(analysis,{localState:local,remoteState:remote,resolutions:{variables:'remote'}});
assert.equal(merged.unresolved.length,0);
assert.equal(merged.state.variables.sku,'REMOTE-SKU');
const noBase=analyzeProjectMerge({localState:local,remoteState:remote});
assert.ok(noBase.conflicts.length>0,'first compare without base must not silently auto-merge differences');

console.log('BoxStudio V0.15 tests passed');
