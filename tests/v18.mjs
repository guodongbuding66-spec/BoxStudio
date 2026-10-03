import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { buildFoldGraph } from '../src/foldgraph.js';
import { parseSvgAppearance, appearanceStats } from '../src/svgAppearance.js';
import { parseSvgMark, createSvgMarkElement, pathToLines } from '../src/svgMark.js';
import { buildArtworkAtlas, buildPanelArtworkPlan } from '../src/panelArtwork.js';
import { buildBleedContinuityReport, continuitySummary } from '../src/bleedContinuity.js';

const styledSvg=`<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="g"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient>
  <clipPath id="clip"><rect x="5" y="5" width="90" height="50"/></clipPath>
  <mask id="mask"><rect x="10" y="10" width="80" height="40" fill="#fff"/></mask>
</defs>
<rect x="0" y="0" width="100" height="60" fill="url(#g)" clip-path="url(#clip)" mask="url(#mask)"/>
<polygon points="10,10 40,10 25,35" fill="#00aa55"/>
</svg>`;
const appearance=parseSvgAppearance(styledSvg,{bounds:{minX:0,minY:0,maxX:100,maxY:60,width:100,height:60}});
const stats=appearanceStats(appearance);
assert.equal(stats.primitives,2);
assert.equal(stats.gradients,1);
assert.equal(stats.clips,1);
assert.equal(stats.masks,1);
assert.equal(appearance.hasPaintedFill,true);
assert.ok(appearance.gradients.g.stops.length===2);
assert.ok(appearance.clips.clip.length===1);
assert.ok(appearance.masks.mask.length===1);

const mark=parseSvgMark(styledSvg,{name:'Filled QA Mark'});
assert.equal(mark.appearance.hasPaintedFill,true);
assert.equal(appearanceStats(mark.appearance).gradients,1);
const state=structuredClone(defaultState);
const geo=generateGeometry(state.structure);
const markEl=createSvgMarkElement(mark,{id:'filled-mark',panelId:'front',x:30,y:20,width:120});
state.elements.push(markEl);
const plan=buildPanelArtworkPlan(state,geo,'front');
assert.ok(plan.commands.some(c=>c.type==='svg-appearance'&&c.source==='filled-mark'));
const atlas=buildArtworkAtlas(state,geo);
assert.ok(atlas.appearanceCommands>=1);

// Quadratic path regression: Y must use the quadratic endpoint's Y coordinate.
const q=pathToLines('M0 0 Q 10 20 20 30',4);
assert.equal(q.at(-1).x2,20);
assert.equal(q.at(-1).y2,30);

const graph=buildFoldGraph(geo),edge=graph.edges.find(e=>e.hinge&&geo.panelMap[e.from]&&geo.panelMap[e.to]);
assert.ok(edge,'default fold graph should expose a physical hinge');
const a=geo.panelMap[edge.from],b=geo.panelMap[edge.to],h=edge.hinge,vertical=Math.abs(h.x2-h.x1)<Math.abs(h.y2-h.y1);
const aSeam=vertical?h.x1-a.x:h.y1-a.y;
const bSeam=vertical?h.x1-b.x:h.y1-b.y;
const mid=vertical?((h.y1+h.y2)/2-a.y):((h.x1+h.x2)/2-a.x);
const makeNear=(id,panelId,seam,panel,otherMid)=>vertical?{id,type:'shape',group:'marks',panelId,x:Math.max(0,Math.min(panel.w-2,seam-1)),y:Math.max(0,Math.min(panel.h-4,otherMid-2)),w:2,h:4,r:0}:{id,type:'shape',group:'marks',panelId,x:Math.max(0,Math.min(panel.w-4,otherMid-2)),y:Math.max(0,Math.min(panel.h-2,seam-1)),w:4,h:2,r:0};
const continuityState=structuredClone(defaultState);continuityState.elements=[];continuityState.elements.push(makeNear('a-seam',edge.from,aSeam,a,mid));
let report=buildBleedContinuityReport(continuityState,geo,graph,{bandMm:3});
assert.ok(report.oneSided>=1,'one-sided fold artwork should be surfaced');
const midB=vertical?((h.y1+h.y2)/2-b.y):((h.x1+h.x2)/2-b.x);
continuityState.elements.push(makeNear('b-seam',edge.to,bSeam,b,midB));
report=buildBleedContinuityReport(continuityState,geo,graph,{bandMm:3});
assert.ok(report.twoSided>=1,'artwork on both sides of a fold should be classified as two-sided');
const summary=continuitySummary(report);
assert.equal(summary.total,report.total);
assert.equal(summary.bandMm,3);

console.log('BoxStudio V0.18 tests passed');
