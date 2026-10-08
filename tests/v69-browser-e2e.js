import {createMarkDocumentV67,buildMarkSvgV67} from '../src/standaloneMarksV67.js';
const checks=[],q=s=>document.querySelector(s),api=()=>window.BoxStudioV69;
const assert=(value,label)=>{if(!value)throw new Error(label);checks.push(label);};
const wait=async(fn,label)=>{const end=Date.now()+25000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,70));}throw new Error('Timed out: '+label);};
const settle=()=>new Promise(r=>setTimeout(r,180));
const click=s=>{if(!q(s))throw new Error('Missing '+s);q(s).click();};
const state=()=>api().getMarkState(),el=id=>state().elements.find(e=>e.id===id),history=()=>api().getMarkHistory().index;
const key=value=>(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true}));
function pointer(target,type,x,y,options={}){const r=q('[data-mark-board] svg').getBoundingClientRect(),s=state();target.dispatchEvent(new PointerEvent(type,{button:0,pointerId:69,bubbles:true,clientX:r.left+x/s.artboard.width*r.width,clientY:r.top+y/s.artboard.height*r.height,...options}));}
function startResize(id,corner='se'){const e=el(id),x=e.x+(corner.includes('e')?e.w:0),y=e.y+(corner.includes('s')?e.h:0);pointer(q(`[data-mark-object="${id}"] [data-mark-resize="${corner}"]`),'pointerdown',x,y);return{x,y};}
function resize(id,dx,dy,{corner='se',cancel='',shiftKey=false}={}){const p=startResize(id,corner),stage=q('[data-mark-stage]');pointer(stage,'pointermove',p.x+dx,p.y+dy,{shiftKey});if(cancel==='escape')key('Escape');if(cancel==='pointer')pointer(stage,'pointercancel',p.x+dx,p.y+dy);pointer(stage,'pointerup',p.x+dx,p.y+dy);}
try{
 await wait(()=>api()&&q('[data-v67-mode="mark"]'),'runtime');await document.fonts.ready;
 const editor=window.BoxStudioEditor,carton=JSON.stringify(editor.getState().elements),cartonHistory=editor.getHistory().index;
 click('[data-v67-mode="mark"]');await wait(()=>q('[data-mark-board]'),'mark workspace');
 const sample=createMarkDocumentV67();sample.projectName='运输唛头 · 角点缩放';api().commitMarkState(sample);api().selectMarks(['label-up']);await settle();
 assert(q('[data-mark-board]').querySelectorAll('[data-mark-resize]').length===4,'Single selection exposes four corner handles');
 const startHistory=history();resize('label-up',8,8);await settle();assert(Math.abs(el('label-up').w-32)<.01&&el('label-up').w===el('label-up').h,'Corner drag resizes icon proportionally');
 assert(history()===startHistory+1,'Resize commits a single undo transaction');
 click('[data-mark-undo]');await settle();assert(el('label-up').w===24&&el('label-up').h===24,'Undo restores original size');
 click('[data-mark-redo]');await settle();assert(el('label-up').w===32,'Redo restores resized geometry');
 const beforeCancel=JSON.stringify(state().elements),cancelHistory=history();resize('label-up',-10,-10,{corner:'nw',cancel:'escape'});await settle();assert(JSON.stringify(state().elements)===beforeCancel&&history()===cancelHistory,'Escape cancels resize without changing history');
 assert(q('[data-mark-object="label-up"] [data-mark-resize="se"]').getAttribute('transform')==='translate(32 32)','Cancelled draft restores the rendered size');
 resize('label-up',10,10,{cancel:'pointer'});await settle();assert(JSON.stringify(state().elements)===beforeCancel&&history()===cancelHistory,'Pointer cancellation restores geometry');
 api().selectMarks(['label-barcode']);resize('label-barcode',-1000,-1000);await settle();assert(el('label-barcode').w===200&&el('label-barcode').h===64,'Barcode corner resize enforces minimum readable dimensions');
 const ratioHistory=history();resize('label-barcode',40,12.8);await settle();assert(Math.abs(el('label-barcode').w/el('label-barcode').h-3.125)<1e-8,'Barcode drag preserves printable aspect ratio');
 assert(history()===ratioHistory+1,'Approved barcode resize is one undo transaction');
 api().selectMarks(['label-sku']);const sku=el('label-sku');resize('label-sku',10,5);await settle();assert(el('label-sku').w===sku.w+10&&el('label-sku').h===sku.h+5,'Text bounding box resizes independently');
 assert(el('label-sku').fontSize===sku.fontSize&&el('label-sku').template===sku.template,'Text resize preserves font size and variable binding');
 api().selectMarks(['label-up','label-fragile']);assert(!q('[data-mark-resize]'),'Multi-selection avoids ambiguous resize handles');
 api().selectMarks(['label-up']);click('[data-object="lock"]');await settle();assert(!q('[data-mark-resize]'),'Locked objects have no active resize handles');click('[data-object="lock"]');await settle();
 assert(q('[data-mark-board]').querySelectorAll('[data-mark-resize]').length===4,'Unlock restores corner controls');
 const beforeFocus=JSON.stringify(state()),focusHistory=history(),normalWidth=q('[data-mark-stage]').getBoundingClientRect().width,normalLibraryDisplay=getComputedStyle(q('[data-mark-library]')).display,normalInspectorDisplay=getComputedStyle(q('[data-mark-inspector]')).display;
 click('[data-v69-focus-toggle]');await settle();assert(api().getCanvasFocus()&&q('[data-v69-focus-toggle]').getAttribute('aria-pressed')==='true','Focus mode updates accessible button state');
 assert(getComputedStyle(q('[data-mark-library]')).display==='none'&&getComputedStyle(q('[data-mark-inspector]')).display==='none','Focus mode hides both work panels');
 assert(q('[data-mark-stage]').getBoundingClientRect().width>=normalWidth,'Focus mode gives the canvas available width');
 assert(JSON.stringify(state())===beforeFocus&&history()===focusHistory,'Focus mode preserves document and undo history');
 resize('label-up',5,5,{cancel:'escape'});await settle();assert(api().getCanvasFocus()&&api().getMarkSelection()[0]==='label-up','First Escape cancels a gesture and keeps focus and selection');
 key('Escape');await settle();assert(!api().getCanvasFocus()&&api().getMarkSelection()[0]==='label-up','Second Escape restores panels without clearing selection');
 assert(getComputedStyle(q('[data-mark-library]')).display===normalLibraryDisplay&&getComputedStyle(q('[data-mark-inspector]')).display===normalInspectorDisplay,'Focus exit restores the responsive workspace panels');
 assert(!/data-mark-resize|selection-box/.test(buildMarkSvgV67(state())),'Print SVG contains no resize or selection controls');
 const saved=JSON.stringify(state().elements);click('[data-v67-mode="box"]');await wait(()=>q('#designSvg')&&q('[data-v69-focus-toggle]'),'carton workspace');
 assert(JSON.stringify(editor.getState().elements)===carton&&editor.getHistory().index===cartonHistory,'Mark resizing preserves carton objects and history');
 click('[data-v69-focus-toggle]');await settle();assert(api().getCanvasFocus()&&getComputedStyle(q('.workspace .rightpanel')).display==='none','Carton canvas supports the same focus interaction');
 key('Escape');await settle();assert(!api().getCanvasFocus()&&getComputedStyle(q('.workspace .rightpanel')).display!=='none','Carton focus restores inspector');
 click('[data-v67-mode="mark"]');await wait(()=>q('[data-mark-board]'),'return to mark');assert(JSON.stringify(state().elements)===saved,'Workspace switching preserves resized document');
 api().commitMarkState(sample);api().selectMarks(['label-up']);await settle();
 assert(q('[data-mark-stage]').getBoundingClientRect().height>=160,'Resize canvas remains usable at this viewport');
 assert(document.documentElement.scrollWidth<=innerWidth+1,'No horizontal page overflow');
 const runtime=window.BoxStudioUiRuntimeV64,start=runtime.stats().flushes;await new Promise(r=>setTimeout(r,400));assert(runtime.stats().flushes-start<5&&runtime.stats().errors.length===0,'Resize and focus runtime is stable at idle');
 document.body.dataset.v69Result=JSON.stringify({status:'PASS',viewport:[innerWidth,innerHeight],checks});
}catch(error){document.body.dataset.v69Result=JSON.stringify({status:'FAIL',checks,error:error.stack});console.error(error);}
