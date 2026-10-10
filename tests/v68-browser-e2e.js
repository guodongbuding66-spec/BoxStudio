import {createMarkDocumentV67,buildMarkSvgV67,buildMarkPdfV67} from '../src/standaloneMarksV67.js';
const checks=[],q=s=>document.querySelector(s),state=()=>window.BoxStudioV68.getMarkState();
const assert=(value,label)=>{if(!value)throw new Error(label);checks.push(label);};
const wait=async(fn,label)=>{const end=Date.now()+25000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,70));}throw new Error('Timed out: '+label);};
const settle=()=>new Promise(r=>setTimeout(r,180));
const click=s=>{if(!q(s))throw new Error('Missing '+s);q(s).click();};
const key=(value,options={})=>window.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,...options}));
const change=(s,value)=>{q(s).value=value;q(s).dispatchEvent(new Event('change',{bubbles:true}));};
const object=id=>q(`[data-mark-object="${CSS.escape(id)}"]`);
const selection=()=>window.BoxStudioV68.getMarkSelection();
const history=()=>window.BoxStudioV68.getMarkHistory().index;
const el=id=>state().elements.find(e=>e.id===id);
function pointer(target,type,x,y,options={}){const r=q('[data-mark-board] svg').getBoundingClientRect(),s=state();target.dispatchEvent(new PointerEvent(type,{button:0,pointerId:68,bubbles:true,clientX:r.left+x/s.artboard.width*r.width,clientY:r.top+y/s.artboard.height*r.height,...options}));}
function choose(id,options={}){const e=el(id);pointer(object(id),'pointerdown',e.x+4,e.y+4,options);pointer(q('[data-mark-stage]'),'pointerup',e.x+4,e.y+4,options);}
function drag(id,dx,dy,{cancel=false}={}){const e=el(id);pointer(object(id),'pointerdown',e.x+4,e.y+4);pointer(q('[data-mark-stage]'),'pointermove',e.x+4+dx,e.y+4+dy);if(cancel)key('Escape');pointer(q('[data-mark-stage]'),'pointerup',e.x+4+dx,e.y+4+dy);}
try{
 await wait(()=>window.BoxStudioV68&&q('[data-v67-mode="mark"]'),'runtime');await document.fonts.ready;
 const api=window.BoxStudioV68,editor=window.BoxStudioEditor,baseline=editor.getState(),cartonHistory=editor.getHistory(),carton=JSON.stringify({structure:baseline.structure,elements:baseline.elements,variables:baseline.variables});
 click('[data-v67-mode="mark"]');await wait(()=>q('[data-mark-board]'),'independent canvas');
 // Explicit horizontal icon fixture: its occupied area requires the approved smaller group.
 const sample=createMarkDocumentV67();sample.projectName='运输唛头 · 多选排版';Object.assign(sample.elements.find(e=>e.id==='label-barcode'),{w:200,h:64,preset:'200x64'});Object.assign(sample.elements.find(e=>e.id==='label-up'),{x:230,y:120});Object.assign(sample.elements.find(e=>e.id==='label-fragile'),{x:256,y:124});Object.assign(sample.elements.find(e=>e.id==='label-dry'),{x:286,y:128});api.commitMarkState(sample);await settle();
 const startHistory=history();choose('label-up');choose('label-fragile',{shiftKey:true});choose('label-dry',{shiftKey:true});
 // These cases isolate explicit movement and the ten millimetre grid.
 // Object edge/center snapping has separate real mouse acceptance in V77.
 await wait(()=>q('[data-v77-nudge] [data-smart]'),'object snap preference');const smart=q('[data-v77-nudge] [data-smart]');smart.checked=false;smart.dispatchEvent(new Event('change',{bubbles:true}));
 assert(selection().length===3,'Shift click selects multiple objects');
 assert(q('[data-mark-board]').querySelectorAll('.selection-box').length===3,'Every selected object has an outline');
 assert(q('.v68-selection-summary').textContent.includes('3 个对象'),'Inspector explains group selection');
 assert(history()===startHistory,'Selection changes do not add undo entries');
 click('[data-mark-align="top"]');await settle();assert(selection().every(id=>el(id).y===120),'Top alignment changes actual positions');
 assert(history()===startHistory+1,'Alignment is one undo transaction');
 click('[data-mark-undo]');await settle();assert(el('label-fragile').y===124&&el('label-dry').y===128,'Undo restores all aligned objects');
 assert(selection().length===3,'Undo retains valid group selection');click('[data-mark-redo]');await settle();
 click('[data-mark-distribute="x"]');await settle();assert(el('label-fragile').x===258,'Equal-gap distribution respects object widths');
 assert(el('label-up').x===230&&el('label-dry').x===286,'Distribution preserves both ends');
 const beforeMove=selection().map(id=>[el(id).x,el(id).y]),beforeMoveHistory=history();drag('label-up',5,10);await settle();
 assert(selection().every((id,i)=>el(id).x===beforeMove[i][0]+5&&el(id).y===beforeMove[i][1]+10),'Pointer drag moves the whole selection');
 assert(history()===beforeMoveHistory+1,'Group drag is one undo transaction');
 const beforeCancel=JSON.stringify(state().elements),cancelHistory=history();drag('label-up',-10,-5,{cancel:true});await settle();
 assert(JSON.stringify(state().elements)===beforeCancel&&history()===cancelHistory,'Escape cancels drag without a history entry');
 assert(object('label-up').getAttribute('transform')===`translate(${el('label-up').x} ${el('label-up').y})`,'Cancelled drag restores the visible position');
 change('[data-mark-move] [name="dx"]','-1000');change('[data-mark-move] [name="dy"]','0');q('[data-mark-move]').requestSubmit();await settle();
 assert(el('label-up').x===0&&el('label-fragile').x===28&&el('label-dry').x===56,'Group movement clamps at edge and keeps relative spacing');
 const edgeHistory=history();key('ArrowLeft');await settle();assert(history()===edgeHistory,'Nudging at the edge creates no empty undo entry');
 key('ArrowRight',{shiftKey:true});await settle();assert(Math.abs(el('label-up').x-2.646)<.001&&Math.abs(el('label-dry').x-58.646)<.001,'Shift arrow moves group by ten CSS pixels at 96 dpi');
 click('[data-mark-undo]');await settle();assert(el('label-up').x===0,'Group nudge undo');
 const snapBox=q('[data-mark-snap]');snapBox.checked=true;snapBox.dispatchEvent(new Event('change',{bubbles:true}));drag('label-up',13,-13);await settle();
 assert(el('label-up').x===10&&el('label-up').y===120,'Drag snaps group origin to the ten millimetre grid');
 assert(q('[data-mark-grid]').checked,'Snap enables the visible grid');
 const currentSnap=q('[data-mark-snap]');currentSnap.checked=false;currentSnap.dispatchEvent(new Event('change',{bubbles:true}));
 click('[data-object="lock"]');await settle();assert(selection().every(id=>el(id).locked),'Lock action applies to entire selection');
 assert(q('[data-mark-delete]').disabled&&q('[data-mark-align="left"]').disabled,'Locked layout controls are disabled');
 const lockedBefore=JSON.stringify(state().elements),lockedHistory=history();key('Delete');key('ArrowRight');await settle();
 assert(JSON.stringify(state().elements)===lockedBefore&&history()===lockedHistory,'Locked selection rejects delete and nudge');
 click('[data-object="duplicate"]');await settle();assert(state().elements.length===16&&selection().length===3,'Duplicate creates a separate group');
 assert(selection().every(id=>!el(id).locked),'Copies are editable while originals remain locked');
 click('[data-mark-delete]');await settle();assert(state().elements.length===13,'Delete removes the entire editable group');
 key('z',{ctrlKey:true});await settle();assert(state().elements.length===16,'Undo restores group deletion');key('z',{ctrlKey:true,shiftKey:true});await settle();
 api.selectMarks(['label-up','label-fragile','label-dry']);click('[data-object="lock"]');await settle();assert(selection().every(id=>!el(id).locked),'Unlock restores editability');
 click('[data-mark-multiselect]');choose('label-contract');choose('label-crn');assert(selection().length===5,'Mobile-friendly multi-select adds objects without modifier keys');
 choose('label-crn');assert(selection().length===4,'Multi-select click removes one object');click('[data-mark-multiselect]');key('Escape');assert(selection().length===0,'Escape clears selection');
 api.commitMarkState(sample);await settle();
 pointer(q('[data-mark-board] svg'),'pointerdown',228,118);pointer(q('[data-mark-stage]'),'pointermove',312,153);pointer(q('[data-mark-stage]'),'pointerup',312,153);
 assert(selection().length===3&&selection().includes('label-dry'),'Marquee selects enclosed editable objects');
 assert(!q('.v68-marquee'),'Marquee guide is removed after selection');
 choose('label-sku');click('[data-object="lock"]');click('[data-inspector="data"]');change('[data-mark-data] [name="sku"]','BOUND-068');q('[data-mark-data]').requestSubmit();await settle();
 assert(el('label-sku').locked&&q('[data-mark-board]').textContent.includes('BOUND-068'),'Locked layout still updates bound shipping data');
 choose('label-sku');assert(q('[data-mark-properties] fieldset').disabled,'Single locked-object form is read-only');
 key('a',{ctrlKey:true});assert(!selection().includes('label-sku')&&selection().length===11,'Select all includes visible editable objects only');
 const beforeInputSelect=[...selection()];click('[data-inspector="data"]');q('[data-mark-data] [name="sku"]').dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true,bubbles:true}));assert(JSON.stringify(selection())===JSON.stringify(beforeInputSelect),'Input editing retains native text shortcuts');
 api.selectMarks(['label-up']);if(innerWidth<=760){click('[data-mark-mobile-library]');await settle();assert(q('dialog[open] [data-mark-library]'),'Component drawer opens');}click('[data-library-tab="layers"]');click('[data-layer-lock="label-up"]');await settle();assert(el('label-up').locked,'Layer lock control updates document');
 click('[data-hide="label-up"]');await settle();assert(selection().length===0&&!object('label-up'),'Hiding a selected layer clears its selection');click('[data-hide="label-up"]');await settle();
 if(innerWidth<=760){click('dialog[open] [data-close]');assert(q('[data-mark-library]')&&!q('dialog[open]'),'Drawer restores library synchronously');}
 const lockedJson=JSON.stringify(state());assert(JSON.parse(lockedJson).elements.find(e=>e.id==='label-up').locked,'JSON preserves layer locks');
 const pdf=new TextDecoder().decode(buildMarkPdfV67(state()));assert(pdf.includes('/MediaBox [0 0 907.087 623.622]'),'Locked objects remain in physical PDF export');
 assert(!buildMarkSvgV67(state()).match(/selection-box|v68-marquee|mark-grid/),'SVG export excludes selection and snap guides');
 const saved=JSON.stringify(state().elements);click('[data-v67-mode="box"]');await wait(()=>q('#designSvg')&&q('[data-v67-mode="mark"]')?.getAttribute('aria-pressed')==='false','carton workspace and navigation restored');
 assert(JSON.stringify({structure:editor.getState().structure,elements:editor.getState().elements,variables:editor.getState().variables})===carton,'Layout operations preserve carton geometry and data');
 assert(editor.getHistory().index===cartonHistory.index,'Mark layout does not pollute carton undo history');
 if(innerWidth<=760){
  click('[data-v63-stage="Marks"]');await wait(()=>q('[data-v67-library-open]')&&q('[data-v67-carton-library] [data-v58-marks-studio]'),'carton marks palette and navigation');click('[data-v67-library-open]');await settle();assert(q('dialog[open] [data-v58-marks-studio]'),'Carton mobile drawer opens current marks palette');click('dialog[open] [data-close]');assert(q('[data-v67-carton-library] [data-v58-marks-studio]'),'Carton palette restored immediately');
 }
 click('[data-v67-mode="mark"]');await wait(()=>q('[data-mark-board]'),'return to label');assert(JSON.stringify(state().elements)===saved,'Mode switch preserves independent layout and locks');
 api.commitMarkState(createMarkDocumentV67());api.selectMarks(['label-up','label-fragile','label-dry']);if(innerWidth<=760)click('[data-mark-mobile-library]');click('[data-library-tab="components"]');if(innerWidth<=760)click('dialog[open] [data-close]');await settle();
 assert(q('[data-mark-stage]').getBoundingClientRect().height>=160,'Selection canvas remains usable');
 assert(document.documentElement.scrollWidth<=innerWidth+1,'No horizontal page overflow');
 const runtime=window.BoxStudioUiRuntimeV64,start=runtime.stats().flushes;await new Promise(r=>setTimeout(r,400));assert(runtime.stats().flushes-start<5&&runtime.stats().errors.length===0,'Layout tools are stable at idle');
 document.body.dataset.v68Result=JSON.stringify({status:'PASS',viewport:[innerWidth,innerHeight],checks});
}catch(error){document.body.dataset.v68Result=JSON.stringify({status:'FAIL',checks,error:error.stack});console.error(error);}
