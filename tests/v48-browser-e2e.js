import { STORAGE_KEY } from '../src/model.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v48_${kind}__`,{method:'POST',body:text})}catch{}};
const click=el=>el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const change=el=>el?.dispatchEvent(new Event('change',{bubbles:true}));
try{
  await waitFor(()=>window.BoxStudioV47&&window.BoxStudioV48,'V0.48 APIs');
  if(window.BoxStudioV48.verifiedTemplates<8)throw new Error(`Expected at least the original 8 verified templates, got ${window.BoxStudioV48.verifiedTemplates}.`);
  const continuation=sessionStorage.getItem('boxstudio-v48-continuation')==='1';
  if(continuation){
    const state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if(state.structure?.template!=='fefco-0203')throw new Error('V0.48 quick-start did not persist FEFCO 0203 across reload.');
    if(state.structure.length!==450||state.structure.width!==320||state.structure.height!==260)throw new Error('V0.48 size preset did not persist across reload.');
    if(state.structure.sizeType!=='external'||state.structure.materialId!=='corrugated-kraft'||state.structure.flute!=='B')throw new Error('V0.48 material or size basis did not persist.');
    if(state.structure.thickness!==3)throw new Error(`B flute thickness should persist as 3 mm, got ${state.structure.thickness}.`);
    if(state.page!=='editor'||state.editorTab!=='Structure')throw new Error('V0.48 did not route to Structure editor.');
    sessionStorage.removeItem('boxstudio-v48-continuation');
    const text=`PASS templates=${window.BoxStudioV48.verifiedTemplates} template=${state.structure.template} size=${state.structure.length}x${state.structure.width}x${state.structure.height} thickness=${state.structure.thickness} reload=persisted`;
    document.body.dataset.pass=text;await signal('pass',text);
  }else{
    const search=await waitFor(()=>document.querySelector('[data-v47-search]'),'template search');search.value='0203';search.dispatchEvent(new Event('input',{bubbles:true}));
    const button=await waitFor(()=>document.querySelector('[data-v47-template="fefco-0203"]'),'FEFCO 0203 result');
    const card=button.closest('.v47-template-card');await waitFor(()=>card?.querySelector('.v48-template-svg'),'real dieline preview');
    click(button);const panel=await waitFor(()=>document.querySelector('[data-v47-config="fefco-0203"]'),'V0.48 config');
    if(panel.querySelector('[data-v47-l]').value!=='400'||panel.querySelector('[data-v47-w]').value!=='300'||panel.querySelector('[data-v47-h]').value!=='250')throw new Error('0203 template defaults are wrong.');
    if(panel.querySelector('[data-v47-flute]').value!=='B'||panel.querySelector('[data-v47-thickness]').value!=='3')throw new Error('0203 board defaults are wrong.');
    await waitFor(()=>panel.querySelector('[data-v48-summary]')?.textContent.includes('制造尺寸'),'dimension summary');
    const medium=panel.querySelector('[data-v48-preset="shipping-m"]');if(!medium)throw new Error('Shipping size preset missing.');click(medium);
    panel.querySelector('[data-v47-size-type]').value='external';change(panel.querySelector('[data-v47-size-type]'));
    panel.querySelector('[data-v47-material]').value='corrugated-kraft';change(panel.querySelector('[data-v47-material]'));
    panel.querySelector('[data-v47-flute]').value='B';change(panel.querySelector('[data-v47-flute]'));
    await sleep(50);if(panel.querySelector('[data-v47-thickness]').value!=='3')throw new Error('B flute did not synchronize thickness to 3 mm.');
    const summary=window.BoxStudioV48.dimensionSummary('fefco-0203',{length:450,width:320,height:260,sizeType:'external',materialId:'corrugated-kraft',flute:'B',thickness:3});
    if(summary.external.L!==450||summary.inside.L!==444)throw new Error('External/internal dimension conversion is incorrect.');
    sessionStorage.setItem('boxstudio-v48-continuation','1');click(panel.querySelector('[data-v47-start]'));
    // Navigation is in-page; reload explicitly to test persisted recovery.
    await waitFor(()=>document.querySelector('.tabbar button.active')?.dataset.tab==='Structure','in-page structure handoff');location.reload();
  }
}catch(error){sessionStorage.removeItem('boxstudio-v48-continuation');const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
