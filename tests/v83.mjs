import assert from 'node:assert/strict';
import {insertSymbolBatchV83,planSymbolBatchV83,SYMBOL_SETS_V83,symbolBatchLayoutV83} from '../src/symbolBatchV83.js';
import {buildMarkPdfV67,buildMarkSvgV67,createMarkDocumentV67,markPreflightV67,setMarkArtboardV67} from '../src/standaloneMarksV67.js';
import {syncMarkFacesV74,switchMarkFaceV74} from '../src/markFacesV74.js';
import {buildProjectPackageV81,inspectProjectPackageV81} from '../src/projectPackageV81.js';
import {generateGeometry} from '../src/geometry.js';
import {defaultState} from '../src/model.js';
import {buildArtworkAtlas} from '../src/panelArtwork.js';
import {markOccupiedBoundsV66,rectanglesOverlapV66} from '../src/shippingMarkLayoutV66.js';

const config={icons:[...SYMBOL_SETS_V83[1].icons,'forkliftHere'],size:26,gap:6,columns:2};
const doc=setMarkArtboardV67(createMarkDocumentV67('blank'),160,110);
doc.elements.push({id:'existing',type:'icon',icon:'up',group:'marks',panelId:'label',x:20,y:20,w:20,h:58,r:0,locked:true});
const original=structuredClone(doc),result=insertSymbolBatchV83(doc,config,'label'),plan=result.plan;
assert.deepEqual(doc,original,'Planning/insertion never mutates the current project');
assert.deepEqual(result.state.elements[0],original.elements[0],'Preserves locked artwork');
assert.deepEqual([plan.w,plan.h],[58,58]);
assert.equal(markOccupiedBoundsV66(doc,'label').some(o=>rectanglesOverlapV66(plan,o,3)),false,'Avoid existing artwork and keep its clearance');
assert.ok(plan.x>=8&&plan.y>=8&&plan.x+plan.w<=152&&plan.y+plan.h<=102,'Preserve artboard safety margins');
assert.deepEqual(result.state.elements.slice(1).map(e=>[e.icon,e.x-plan.x,e.y-plan.y,e.w,e.h]),[
  ['teamLift',0,0,26,26],['heavy',32,0,26,26],['noDrop',0,32,26,26],['forkliftHere',32,32,26,26]
]);
assert.equal(new Set(result.state.elements.map(e=>e.id)).size,5);
assert.ok(markPreflightV67(result.state).ok);
assert.ok(buildMarkSvgV67(result.state).includes('data-handling-art')&&!buildMarkSvgV67(result.state).includes('<image'));
assert.ok(!new TextDecoder().decode(buildMarkPdfV67(result.state)).includes('/Subtype /Image'),'Batch outputs retain vectors');
for(const patch of [{size:9},{gap:-1},{columns:1.5},{size:NaN},{icons:[]},{icons:['up','up']},{icons:['fake']},{icons:['stackWeight']}])assert.throws(()=>symbolBatchLayoutV83({...config,...patch}));
assert.throws(()=>insertSymbolBatchV83(doc,{...config,size:100},'label'),/放不下/);
assert.throws(()=>insertSymbolBatchV83(doc,config,'missing'),/目标面/);
assert.deepEqual(doc,original,'No partial commit when the group cannot fit');

const notched=setMarkArtboardV67(createMarkDocumentV67('blank'),80,38);
const panel=notched.structure.importedGeometry.panels[0];
panel.points=[[0,0],[29.7,0],[29.7,29],[29.9,29],[29.9,0],[80,0],[80,38],[0,38]];
const narrow={icons:['up','dry'],size:20,gap:24,columns:2};
assert.throws(()=>planSymbolBatchV83(notched,narrow,'label'),/未找到/,'Reject even a thin notch across the layout');
panel.points[2][1]=panel.points[3][1]=5;
assert.equal(planSymbolBatchV83(notched,narrow,'label').x,8,'The same layout fits when the notch ends outside it');

const carton=structuredClone(defaultState);carton.elements=[];
const geo=generateGeometry(carton.structure),face=geo.bodyPanels.find(p=>p.kind==='panel'&&p.w>100&&p.h>100);
const applied=insertSymbolBatchV83(carton,config,face.id),atlas=buildArtworkAtlas(applied.state,geo);
assert.deepEqual(atlas.plans.find(p=>p.panelId===face.id).commands.filter(c=>c.type==='icon').map(c=>c.icon),config.icons);
assert.equal(applied.state.markEditorPanelId,face.id);
assert.equal(carton.elements.length,0);
carton.elements.push({...doc.elements[0],panelId:face.id,r:90});
const aroundRotated=planSymbolBatchV83(carton,config,face.id);
assert.equal(markOccupiedBoundsV66(carton,face.id).some(o=>rectanglesOverlapV66(aroundRotated,o,3)),false,'Avoid the rotated carton artwork bounds');

let side=switchMarkFaceV74(syncMarkFacesV74(result.state),'side',setMarkArtboardV67);
side.elements=[];side.selectedId='';
side=syncMarkFacesV74(insertSymbolBatchV83(side,{...config,icons:['noBlade','openHere']},'label').state);
const restored=await inspectProjectPackageV81((await buildProjectPackageV81('marks',side)).bytes);
assert.deepEqual(restored.state.markFacesV74.front.elements,result.state.elements,'Front mark unchanged when adding to the side');
assert.deepEqual(restored.state.markFacesV74.side.elements.map(e=>e.icon),['noBlade','openHere']);
console.log('PASS V83: exact spacing, obstruction and notch rejection, atomic insertion, carton atlas, vector output and two-face restore');
