import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, stateForTemplate } from '../src/model.js';
import { buildLinkedWorkspaceModelV49 } from '../src/linkedWorkspaceV49.js';
import { ensureFoldSequenceV51, buildFoldSequenceModelV51, scanFoldSequenceV51 } from '../src/foldSequenceV51.js';
import { collisionScoreV52, collisionEventsV52, locateCollisionV52, stateAtTimelineV52, collisionHighlightV52, suggestSequenceV52, applySequenceSuggestionV52, collisionOptimizationAcceptanceV52, V52_OPT_SCHEMA } from '../src/collisionOptimizationV52.js';

const projectFor=id=>{const preset=stateForTemplate(id,defaultState.variables),state=structuredClone(defaultState);state.structure=preset.structure;state.elements=preset.elements;state.variables=preset.variables;state.selectedId=preset.selectedId;state.page='editor';state.editorTab='3D';state.foldProgress=100;return state};
const linked=buildLinkedWorkspaceModelV49(projectFor('fefco-0203')),graph=linked.review.graph,geo=linked.review.geo;
let state=ensureFoldSequenceV51(linked.state,graph),model=buildFoldSequenceModelV51(state,graph,geo),report=scanFoldSequenceV51(state,graph,geo);
assert.ok(model.stepCount>=8,'V0.52 optimizer needs a real multi-step fold sequence.');
assert.ok(report.samples>model.stepCount,'V0.52 must retain intermediate fold-path samples.');

const events=collisionEventsV52(report);assert.ok(events.length>0,'FEFCO 0203 regression should expose reviewable overlap/contact events.');
const first=events[0],loc=locateCollisionV52(report,first.id,model.stepCount);assert.ok(loc);assert.equal(loc.id,first.id);assert.equal(loc.timeline,first.firstTimeline);assert.ok(loc.panels.includes(first.a)&&loc.panels.includes(first.b));assert.ok(loc.activeStep>=1&&loc.activeStep<=model.stepCount);
const highlight=collisionHighlightV52(report,first.id);assert.ok(highlight.activePanels.includes(first.a)&&highlight.activePanels.includes(first.b));if(first.type==='penetration')assert.ok(highlight.penetrationPanels.includes(first.a));else assert.ok(highlight.overlapPanels.includes(first.a));

const atCollision=stateAtTimelineV52(state,graph,geo,loc.timeline),collisionModel=buildFoldSequenceModelV51(atCollision,graph,geo);assert.equal(Math.round(collisionModel.v50.timeline*1000),Math.round(loc.timeline*1000),'collision jump must retain the exact sampled timeline');assert.ok(atCollision.foldSequenceV51.currentStep>=0&&atCollision.foldSequenceV51.currentStep<=model.stepCount);

assert.ok(collisionScoreV52({penetrations:[{firstTimeline:0,lastTimeline:0}],overlaps:[]})>collisionScoreV52({penetrations:[],overlaps:Array.from({length:500},()=>({firstTimeline:0,lastTimeline:0}))}),'penetration must outrank large overlap counts in optimizer scoring');
const optimization=suggestSequenceV52(state,graph,geo,{limit:3,maxPasses:1});assert.equal(optimization.schema,V52_OPT_SCHEMA);assert.equal(optimization.stepCount,model.stepCount);assert.ok(optimization.evaluated>=model.stepCount,'optimizer should evaluate baseline plus adjacent Step alternatives');assert.ok(optimization.best.score<=optimization.baseline.score,'optimizer best result must never be worse than baseline');
for(const suggestion of optimization.suggestions){assert.equal(suggestion.order.length,model.stepCount);assert.equal(new Set(suggestion.order).size,model.stepCount,'suggestion must be a permutation of Steps');assert.deepEqual([...suggestion.order].sort((a,b)=>a-b),Array.from({length:model.stepCount},(_,i)=>i+1));}
if(optimization.suggestions[0]){const applied=applySequenceSuggestionV52(state,graph,optimization.suggestions[0]),appliedModel=buildFoldSequenceModelV51(applied,graph,geo);assert.equal(appliedModel.stepCount,model.stepCount);assert.equal(new Set(applied.foldSequenceV51.edgeSteps.map(x=>x.step)).size,model.stepCount,'applied suggestion must preserve contiguous Step groups');}

const acceptance=collisionOptimizationAcceptanceV52(state,graph,geo);assert.equal(acceptance.ok,true,JSON.stringify(acceptance.errors));assert.equal(acceptance.summary.stepCount,model.stepCount);assert.ok(acceptance.summary.events>0);
const renderer=await readFile(new URL('../src/paperPreviewV77.js',import.meta.url),'utf8');assert.ok(renderer.includes('#ff4d5a'),'V0.52 renderer must include penetration red');assert.ok(renderer.includes('#ff9f43'),'V0.52 renderer must include overlap orange');assert.ok(renderer.includes('activePanels'));
const ui=await readFile(new URL('../src/v52Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('3D 冲突高亮 / 定位关键帧 / 避碰折叠顺序建议'));assert.ok(ui.includes('分析避碰顺序'));assert.ok(ui.includes('应用方案'));
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');const titleVersion=Number(index.match(/BoxStudio V0\.(\d+)/)?.[1]||0);assert.ok(titleVersion>=52,'Product title must stay at V0.52 or newer.');assert.ok(index.includes('v52Ui.css'));assert.ok(index.includes('v52Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.ok(Number(pkg.version.split('.')[1])>=52,'Package version must stay at V0.52 or newer.');assert.equal(pkg.scripts['test:v52'],'node tests/v52.mjs');
console.log(`BoxStudio V0.52 collision visualization/optimizer passed: steps=${model.stepCount} events=${events.length} evaluated=${optimization.evaluated} baseline=${Math.round(optimization.baseline.score)} best=${Math.round(optimization.best.score)}`);
