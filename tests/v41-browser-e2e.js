import { STORAGE_KEY } from '../src/model.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(60)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v41_${kind}__`,{method:'POST',body:text})}catch{}};
const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
const stage=()=>Number(sessionStorage.getItem('boxstudio-v41-stage')||0);
const setStage=n=>sessionStorage.setItem('boxstudio-v41-stage',String(n));

try{
  await waitFor(()=>window.BoxStudioV41,'V0.41 API');
  await waitFor(()=>document.querySelector('.workspace'),'workspace');
  const currentStage=stage();

  if(currentStage===0){
    if(window.BoxStudioV41.freeAccess!==true||window.BoxStudioV41.approvalRequired!==false)throw new Error('Free-access policy is not active.');
    if(!document.querySelector('.v40-shell'))throw new Error('V0.40 professional shell missing.');
    if(!document.querySelector('[data-v41-template-top]'))throw new Error('Template Center launcher missing.');
    window.BoxStudioV41.openTemplateCenter();
    const overlay=await waitFor(()=>document.querySelector('#boxstudio-v41-templates'),'Template Center');
    const search=overlay.querySelector('[data-v41-search]');search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));
    const card=await waitFor(()=>overlay.querySelector('[data-v41-template="fefco-0427"]'),'0427 result');
    setStage(1);card.click();
  }else if(currentStage===1){
    const s=state();if(s.structure.template!=='fefco-0427')throw new Error(`Template did not persist: ${s.structure.template}`);
    const generator=await waitFor(()=>document.querySelector('[data-v41-generator]'),'Generator');
    generator.querySelector('[data-v41-mode="external"]').click();
    const fields=Object.fromEntries([...generator.querySelectorAll('[data-v41-size]')].map(i=>[i.dataset.v41Size,i]));fields.length.value='320';fields.width.value='210';fields.height.value='80';
    generator.querySelector('[data-v41-material="corrugated-kraft"]').click();
    setStage(2);generator.querySelector('[data-v41-apply]').click();
  }else if(currentStage===2){
    const s=state();
    if(s.structure.sizeType!=='external')throw new Error(`Dimension mode mismatch: ${s.structure.sizeType}`);
    if(Number(s.structure.length)!==320||Number(s.structure.width)!==210||Number(s.structure.height)!==80)throw new Error('Generator dimensions did not persist.');
    if(s.structure.materialId!=='corrugated-kraft')throw new Error(`Material did not persist: ${s.structure.materialId}`);
    document.querySelector('.tabbar [data-tab="Design"]')?.click();
    const scope=await waitFor(()=>document.querySelector('.v41-face-scope'),'Design scope');scope.querySelector('[data-v41-scope="multi"]').click();
    if(document.body.dataset.v41Scope!=='multi')throw new Error('Multi-face scope did not activate.');
    const fold=document.querySelector('[data-v41-fold]');fold.value='55';fold.dispatchEvent(new Event('input',{bubbles:true}));await sleep(80);
    if(Number(state().foldProgress)!==55)throw new Error('Fold slider did not persist.');
    document.querySelector('[data-v41-review]').click();
    await waitFor(()=>document.querySelector('#boxstudio-v35-review'),'2D↔3D review');
    const text=`PASS template=${state().structure.template} mode=${state().structure.sizeType} material=${state().structure.materialId} fold=${state().foldProgress}`;
    document.body.dataset.pass=text;sessionStorage.setItem('boxstudio-v41-stage','done');await signal('pass',text);
  }else if(sessionStorage.getItem('boxstudio-v41-stage')!=='done'){
    throw new Error(`Unexpected V0.41 E2E stage: ${currentStage}`);
  }
}catch(error){const text=`FAIL stage=${sessionStorage.getItem('boxstudio-v41-stage')} ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
