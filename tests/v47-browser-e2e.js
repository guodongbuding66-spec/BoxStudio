import { STORAGE_KEY } from '../src/model.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v47_${kind}__`,{method:'POST',body:text})}catch{}};
const click=el=>el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
try{
  await waitFor(()=>window.BoxStudioV47,'V0.47 API');
  if(!window.BoxStudioV47.freePolicy?.freeForEveryone||window.BoxStudioV47.freePolicy?.loginRequired||window.BoxStudioV47.freePolicy?.paywall)throw new Error('Free-for-everyone policy is not active.');
  const continuation=sessionStorage.getItem('boxstudio-v47-continuation')==='1';
  if(continuation){
    const state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if(state.structure?.template!=='fefco-0427')throw new Error('Template quick-start did not persist fefco-0427 across reload.');
    if(state.structure.length!==360||state.structure.width!==240||state.structure.height!==95)throw new Error('Quick-start dimensions were not persisted across reload.');
    if(state.structure.sizeType!=='external'||state.structure.materialId!=='corrugated-kraft'||state.structure.flute!=='B')throw new Error('Quick-start material/size type were not persisted across reload.');
    if(state.page!=='editor'||state.editorTab!=='Structure')throw new Error('Quick-start did not route into Structure editor.');
    sessionStorage.removeItem('boxstudio-v47-continuation');
    const text=`PASS free=true template=${state.structure.template} size=${state.structure.length}x${state.structure.width}x${state.structure.height} workflow=${window.BoxStudioV47.workflow.length} reload=persisted`;
    document.body.dataset.pass=text;await signal('pass',text);
  }else{
    await waitFor(()=>document.querySelector('[data-v47-free]'),'free badge');
    const search=await waitFor(()=>document.querySelector('[data-v47-search]'),'template search');
    search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));
    const card=await waitFor(()=>document.querySelector('[data-v47-template="fefco-0427"]'),'0427 template result');click(card);
    const panel=await waitFor(()=>document.querySelector('[data-v47-config]'),'quick size panel');
    panel.querySelector('[data-v47-l]').value='360';panel.querySelector('[data-v47-w]').value='240';panel.querySelector('[data-v47-h]').value='95';panel.querySelector('[data-v47-size-type]').value='external';panel.querySelector('[data-v47-material]').value='corrugated-kraft';panel.querySelector('[data-v47-flute]').value='B';
    sessionStorage.setItem('boxstudio-v47-continuation','1');
    click(panel.querySelector('[data-v47-start]'));
    // Navigation is in-page; reload explicitly to test persisted recovery.
    await waitFor(()=>document.querySelector('.tabbar button.active')?.dataset.tab==='Structure','in-page structure handoff');location.reload();
  }
}catch(error){sessionStorage.removeItem('boxstudio-v47-continuation');const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
