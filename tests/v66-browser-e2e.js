import {createProjectEnvelope,serializeProjectEnvelope,parseProjectEnvelope,createLocalProjectLibrary} from '../src/projectStore.js';
import {rectanglesOverlapV66} from '../src/shippingMarkLayoutV66.js';
import {renderTemplate} from '../src/variables.js';
import {buildProductionPdf} from '../src/export.js';

const checks=[],assert=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label)};
const wait=async(fn,label)=>{const end=Date.now()+25000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,70))}throw new Error('Timed out: '+label)};
const settle=()=>new Promise(r=>setTimeout(r,180));
const q=s=>document.querySelector(s),click=s=>{const el=q(s);if(!el)throw new Error('Missing '+s);el.click()};
const change=(s,v)=>{const el=q(s);if(!el)throw new Error('Missing '+s);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))};
const submit=s=>q(s).requestSubmit();
async function stage(name){click(`[data-v63-stage="${name}"]`);await settle()}
async function importFile(text){const previous=q('[data-project-status]').textContent,data=new DataTransfer();data.items.add(new File([text],'acceptance.boxstudio.json',{type:'application/json'}));q('[data-file]').files=data.files;q('[data-file]').dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>!q('[data-v66-project-dialog]')||q('[data-project-status]').textContent!==previous,'JSON import result')}
try{
 await wait(()=>window.BoxStudioV66&&q('[data-v66-library]'),'full V66 runtime');
 await document.fonts.ready;
 const editor=window.BoxStudioEditor,lib=createLocalProjectLibrary(localStorage),token=Math.random();window.v66DocumentToken=token;
 const original=editor.getState();click('[data-v66-library]');await wait(()=>q('[data-v47-search]'),'library');
 assert(lib.list().length===1,'Returning to library saves previous design');
 change('[data-v47-search]','no-such-template');await settle();assert(q('[data-v47-grid]').textContent.includes('没有匹配'),'Search empty state');
 change('[data-v47-search]','150010');await settle();click('[data-v47-template="mailer-150010"]');await wait(()=>q('.v59-stage-canvas svg'),'configuration');
 const preview=q('.v59-stage-canvas').innerHTML;change('[data-v47-l]','360');await settle();assert(q('.v59-stage-canvas').innerHTML!==preview,'Dimensions redraw actual dieline preview');
 change('[data-v47-l]','0');click('[data-v47-start]');await settle();assert(editor.getState().page==='templates'&&!q('[data-v47-l]').validity.valid,'Invalid dimension cannot generate');
 click('[data-v48-preset="mailer-m"]');await settle();assert(q('[data-v59-stage-size]').textContent.includes('323.0'),'Dimension preset updates live metrics');
 change('[data-v47-l]','320');change('[data-v47-w]','220');change('[data-v47-h]','80');click('[data-v47-start]');await wait(()=>q('[data-v63-stage="Marks"]'),'generated editor');await settle();
 assert(editor.getState().structure.length===320&&editor.getState().structure.width===220&&editor.getState().structure.height===80,'Configuration reaches core dimensions');
 assert(editor.getState().variables.length==='12.60','New structure synchronizes shipping dimensions');
 assert(!editor.getState().projectId,'New design has a separate project identity');
 await stage('Marks');await wait(()=>q('[data-v66-mark-data]'),'mark data form');change('[data-v58-mark-panel]','lid');
 if(innerWidth<=760){click('[data-v66-presets-toggle]');await settle();assert(q('[data-v66-presets-toggle]').getAttribute('aria-expanded')==='true','Mobile preset accordion expands');}
 const existing=editor.getState().elements.map(e=>e.id);click('[data-v58-mark="crn"]');await settle();change('[data-v58-mark-panel]','lid');click('[data-v58-mark="crn"]');await settle();
 let marks=editor.getState().elements.filter(e=>!existing.includes(e.id));assert(marks.length===2&&!rectanglesOverlapV66(marks[0],marks[1],3),'Repeated CRN presets avoid overlap');
 change('[data-v66-mark-data] [name="crn"]','CRN-ACCEPT-66');change('[data-v66-mark-data] [name="dimensionUnit"]','CM');submit('[data-v66-mark-data] form');await settle();
 assert(editor.getState().elements.filter(e=>e.template?.includes('{{crn}}')).every(e=>renderTemplate(e.template,editor.getState().variables).includes('CRN-ACCEPT-66')),'One CRN edit synchronizes every bound position');
 assert(editor.getState().variables.length==='32.0','Unit change recalculates synchronized dimensions');
 const before=JSON.stringify(editor.getState().variables),history=editor.getHistory().index;change('[data-v66-mark-data] [name="nw"]','90');change('[data-v66-mark-data] [name="gw"]','10');submit('[data-v66-mark-data] form');await settle();
 assert(q('[data-v66-mark-data] [data-errors]').textContent.includes('毛重不能小于净重'),'Invalid shipping data has visible error');
 assert(JSON.stringify(editor.getState().variables)===before&&editor.getHistory().index===history,'Invalid form preserves project and history');
 change('[data-v66-mark-data] [name="nw"]','12');change('[data-v66-mark-data] [name="gw"]','15');change('[data-v66-mark-data] [name="packageIndex"]','1');change('[data-v66-mark-data] [name="packageCount"]','1');submit('[data-v66-mark-data] form');await settle();
 assert(editor.getState().variables.nw==='12'&&editor.getState().variables.packageCount==='1','Valid shipping data committed');
 click('#undo');await settle();assert(editor.getState().variables.nw===JSON.parse(before).nw,'Shipping form undo');click('#redo');await settle();assert(editor.getState().variables.nw==='12','Shipping form redo');
 change('[data-v58-mark-panel]','base');click('[data-v58-mark="barcodeQr"]');await settle();let group=editor.getState().elements.find(e=>e.id===editor.getState().selectedId);
 assert(group.type==='barcode-qr-group'&&Math.abs(group.w/group.h-3.125)<1e-8,'Barcode and QR insert with locked ratio');
 change('#barcodePreset','250x80');await settle();group=editor.getState().elements.find(e=>e.id===editor.getState().selectedId);assert(group.w===250&&group.h===80,'Large preset keeps the barcode group intact');
 change('#barcodePreset','200x64');await settle();group=editor.getState().elements.find(e=>e.id===editor.getState().selectedId);assert(group.w===200&&group.h===64,'Small preset keeps the barcode group intact');
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true}));await settle();assert(editor.getState().projectId&&lib.list().length===2,'Ctrl S saves in HTTP browser context');
 click('[data-v66-projects]');await settle();change('[data-project-name]','V66 验收项目');submit('[data-name-form]');await settle();click('[data-save]');await settle();
 const savedId=editor.getState().projectId;assert(lib.load(savedId).label==='V66 验收项目','Rename and save project');
 click('[data-copy]');await settle();assert(editor.getState().projectId!==savedId&&lib.list().length===3,'Save copy uses independent identity');
 click('[data-close]');await settle();await stage('Design');
 const restored=lib.load(savedId),next=editor.getState();next.variables.crn='CHANGED';editor.commitState(next);await settle();click('[data-v66-projects]');await settle();click(`[data-open="${savedId}"]`);await settle();
 assert(editor.getState().variables.crn==='CRN-ACCEPT-66','Saved project restores shipping marks');assert(lib.list().length===4,'Opening project preserves previous design backup');
 click('[data-v66-projects]');await settle();const identity=editor.getState().projectId,objects=editor.getState().elements.length;
 await importFile('{invalid json');assert(q('[data-project-status]').textContent.includes('打开失败')&&editor.getState().projectId===identity,'Malformed JSON import leaves current project intact');
 const invalid=createProjectEnvelope(editor.getState(),{id:'invalid-project'});invalid.state.elements[0].panelId='unknown-panel';await importFile(serializeProjectEnvelope(invalid));assert(q('[data-project-status]').textContent.includes('目标面不存在')&&editor.getState().elements.length===objects,'Invalid panel import is rejected');
 const envelope=createProjectEnvelope(restored.state,{id:'imported-acceptance',label:'导入验收'});await importFile(serializeProjectEnvelope(envelope));assert(editor.getState().projectId==='imported-acceptance'&&!q('dialog[open]'),'Valid JSON imports and closes dialog');
 const roundtrip=parseProjectEnvelope(serializeProjectEnvelope(createProjectEnvelope(editor.getState())));assert(roundtrip.state.variables.crn==='CRN-ACCEPT-66','Project JSON roundtrip preserves bound data');
 const pdf=buildProductionPdf(editor.getState());assert(pdf.length>10000,'Edited project exports production PDF');
 await stage('3D');await wait(()=>q('#threeCanvas canvas'),'WebGL');assert(q('#threeCanvas').getBoundingClientRect().height>=200,'3D preview mounts with usable height');
 await stage('Preflight');assert(q('.preflight')?.textContent.length>50,'Preflight reads restored project');await stage('Export');assert(q('#exportPdf'),'Export remains accessible');
 await stage('Marks');editor.fitCanvas();await settle();assert(window.v66DocumentToken===token,'Whole project and editor flow avoids document reload');
 assert(document.documentElement.scrollWidth<=innerWidth+4,'No horizontal viewport overflow');assert(q('.canvas-shell').getBoundingClientRect().height>=160,'Shipping canvas has usable height');
 assert(q('[data-v66-projects]').getBoundingClientRect().height>=30,'Projects control visible');
 const runtime=window.BoxStudioUiRuntimeV64,start=runtime.stats().flushes;await new Promise(r=>setTimeout(r,800));assert(runtime.stats().flushes-start<=4,'Full production entry stable at idle');assert(runtime.stats().errors.length===0,'Shared runtime has no errors');
 document.body.dataset.v66Result=JSON.stringify({status:'PASS',viewport:[innerWidth,innerHeight],checks,pdfBytes:pdf.length,originalTemplate:original.structure.template});
}catch(error){document.body.dataset.v66Result=JSON.stringify({status:'FAIL',checks,error:error.stack});console.error(error)}
