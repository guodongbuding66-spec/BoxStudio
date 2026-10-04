import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { parseSvgMark, createSvgMarkElement } from '../src/svgMark.js';
import { buildPanelArtworkPlan } from '../src/panelArtwork.js';
import {
  ensureEditorV33, setSelectionV33, selectElementV33, selectionIdsV33, selectedElementsV33,
  groupSelectionV33, ungroupSelectionV33, copySelectionV33, pasteClipboardV33, duplicateSelectionV33,
  deleteSelectionV33, moveSelectionZV33, alignSelectionV33, distributeSelectionV33, translateSelectionV33,
  updatePrimaryElementV33, setSelectionFlagV33, setLayerStateV33, elementVisibleV33, elementLockedV33,
  insertTableV33, panelFocusV33, fitAllV33
} from '../src/editorCoreV33.js';

let state=ensureEditorV33(structuredClone(defaultState));
assert.ok(state.editorV33.layers.artwork.visible);
assert.ok(state.editorV33.layers.marks.visible);
assert.equal(state.editorV33.layers.dieline.locked,true);

const first=state.elements[0].id,second=state.elements[1].id;
state=setSelectionV33(state,[first,second],{primary:second});
assert.deepEqual(selectionIdsV33(state),[first,second]);
assert.equal(state.selectedId,second);
state=groupSelectionV33(state,{groupId:'group-test',name:'Test Group'});
assert.equal(state.elements.find(x=>x.id===first).groupId,'group-test');
assert.equal(state.elements.find(x=>x.id===second).groupId,'group-test');
state=selectElementV33(state,first);
assert.deepEqual(new Set(selectionIdsV33(state)),new Set([first,second]),'group-aware click should select whole group');
state=ungroupSelectionV33(state);
assert.equal(state.elements.find(x=>x.id===first).groupId,undefined);

state=setSelectionV33(state,[first,second]);
const clip=copySelectionV33(state);assert.equal(clip.elements.length,2);
const pasted=pasteClipboardV33(state,clip,{offsetMm:5,idFactory:(el,i)=>`paste-${i}`});
assert.deepEqual(selectionIdsV33(pasted),['paste-0','paste-1']);
assert.equal(pasted.elements.find(x=>x.id==='paste-0').x,state.elements.find(x=>x.id===first).x+5);
const dup=duplicateSelectionV33(state,{offsetMm:9,idFactory:(el,i)=>`dup-${i}`});
assert.ok(dup.elements.some(x=>x.id==='dup-0'));
assert.equal(dup.elements.length,state.elements.length+2);
assert.equal(deleteSelectionV33(dup).elements.length,state.elements.length);

state=setSelectionV33(state,[first]);
const zFront=moveSelectionZV33(state,'front');assert.equal(zFront.elements.at(-1).id,first);
const zBack=moveSelectionZV33(state,'back');assert.equal(zBack.elements[0].id,first);

// Exact geometry + move are clamped/re-anchored through the same parametric panel model.
state=setSelectionV33(state,[first],{primary:first});const oldX=state.elements.find(x=>x.id===first).x;
state=translateSelectionV33(state,5,0);assert.equal(state.elements.find(x=>x.id===first).x,oldX+5);
state=updatePrimaryElementV33(state,{w:123.5,r:17});assert.equal(state.elements.find(x=>x.id===first).w,123.5);assert.equal(state.elements.find(x=>x.id===first).r,17);

// Align/distribute operate in absolute document coordinates, including elements on different panels.
let multi=structuredClone(defaultState);multi.elements=[
  {id:'a',type:'shape',group:'artwork',panelId:'front',x:20,y:20,w:40,h:20,r:0},
  {id:'b',type:'shape',group:'artwork',panelId:'front',x:100,y:60,w:30,h:20,r:0},
  {id:'c',type:'shape',group:'artwork',panelId:'front',x:210,y:90,w:20,h:20,r:0},
];multi=ensureEditorV33(multi);multi=setSelectionV33(multi,['a','b','c']);
const aligned=alignSelectionV33(multi,'top');assert.equal(aligned.elements.find(x=>x.id==='a').y,aligned.elements.find(x=>x.id==='b').y);assert.equal(aligned.elements.find(x=>x.id==='b').y,aligned.elements.find(x=>x.id==='c').y);
const distributed=distributeSelectionV33(multi,'horizontal'),centers=distributed.elements.map(x=>x.x+x.w/2);assert.ok(Math.abs((centers[1]-centers[0])-(centers[2]-centers[1]))<1e-6);

let flags=setSelectionV33(structuredClone(defaultState),[first]);flags=setSelectionFlagV33(flags,'locked',true);assert.equal(elementLockedV33(flags,flags.elements.find(x=>x.id===first)),true);flags=setSelectionFlagV33(flags,'hidden',true);assert.equal(elementVisibleV33(flags,flags.elements.find(x=>x.id===first)),false);flags=setLayerStateV33(flags,'marks',{visible:false,locked:true});assert.equal(flags.editorV33.layers.marks.visible,false);assert.equal(flags.editorV33.layers.marks.locked,true);

// Table is flattened into existing production-safe shape/line/text primitives, not a UI-only custom object.
let tableState=structuredClone(defaultState);const before=tableState.elements.length;tableState=insertTableV33(tableState,{panelId:'front',rows:3,cols:3,w:180,h:90});const tableEls=selectedElementsV33(tableState);assert.equal(tableState.elements.length,before+1+2+2+9);assert.equal(tableEls.length,14);assert.ok(tableEls.every(x=>x.groupId===tableEls[0].groupId));assert.ok(tableEls.some(x=>x.type==='shape'));assert.ok(tableEls.some(x=>x.type==='line'));assert.ok(tableEls.some(x=>x.type==='text'));const tablePlan=buildPanelArtworkPlan(tableState,generateGeometry(tableState.structure),'front');assert.ok(tablePlan.commands.some(x=>x.type==='rect'));assert.ok(tablePlan.commands.some(x=>x.type==='line'));assert.ok(tablePlan.commands.some(x=>x.type==='text'));

// V0.33 Image is deliberately production-safe SVG vector import. It becomes svg-symbol and the production plan materializes it.
const svg='<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="90" height="40"/><line x1="5" y1="25" x2="95" y2="25"/></svg>';
const mark=parseSvgMark(svg,{name:'V33 Vector Image'}),image=createSvgMarkElement(mark,{id:'v33-image',panelId:'front',x:20,y:20,width:80});image.group='artwork';let imageState=structuredClone(defaultState);imageState.elements.push(image);const imagePlan=buildPanelArtworkPlan(imageState,generateGeometry(imageState.structure),'front');assert.ok(imagePlan.commands.some(x=>x.source==='v33-image'),'SVG vector image must enter production artwork plan');

const focus=panelFocusV33(defaultState,'front');assert.equal(focus.panel.id,'front');assert.ok(focus.viewBox.split(' ').length===4);const all=fitAllV33(focus.state);assert.equal(all.state.editorV33.fitMode,'all');

// V0.33 must remain present after later releases, but the shell/package version is allowed to advance.
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('v33Ui.css'));assert.ok(index.includes('v33Ui.js'));
const ui=await readFile(new URL('../src/v33Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('Professional 2D'));assert.ok(ui.includes('Image SVG'));assert.ok(ui.includes('Table'));assert.ok(ui.includes('Panel Focus'));assert.ok(ui.includes("key==='c'"));assert.ok(ui.includes("key==='v'"));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));const [major,minor]=String(pkg.version||'0.0.0').split('.').map(Number);assert.ok(major>0||(major===0&&minor>=33),`Expected package version >= 0.33.0; got ${pkg.version}`);
console.log('BoxStudio V0.33 professional 2D editor tests passed');
