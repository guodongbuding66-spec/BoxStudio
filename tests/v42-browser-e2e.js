import { STORAGE_KEY } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(60)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v42_${kind}__`,{method:'POST',body:text})}catch{}};
const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
const stage=()=>Number(sessionStorage.getItem('boxstudio-v42-stage')||0);
const setStage=n=>sessionStorage.setItem('boxstudio-v42-stage',String(n));

try{
  await waitFor(()=>window.BoxStudioV42,'V0.42 API');
  await waitFor(()=>document.querySelector('.workspace'),'workspace');
  const currentStage=stage();

  if(currentStage===0){
    if(window.BoxStudioV42.freeAccess!==true||window.BoxStudioV42.approvalRequired!==false)throw new Error('V0.42 free-access policy missing.');
    if(window.BoxStudioV42.cornerRadiusProductionArc!==false)throw new Error('Corner-radius production capability is being overstated.');
    window.BoxStudioV41.openTemplateCenter();
    const overlay=await waitFor(()=>document.querySelector('#boxstudio-v41-templates'),'Template Center');
    const search=overlay.querySelector('[data-v41-search]');search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));
    const card=await waitFor(()=>overlay.querySelector('[data-v41-template="fefco-0427"]'),'0427 result');
    const detail=await waitFor(()=>card.querySelector('.v42-card-detail'),'0427 detail affordance');detail.click();
    const detailHost=await waitFor(()=>document.querySelector('#boxstudio-v42-detail'),'Template detail');
    if(!detailHost.querySelector('.v42-dieline-preview svg'))throw new Error('Template detail missing real dieline preview.');
    if(detailHost.querySelectorAll('.v42-panel-card').length<4)throw new Error('Template detail missing semantic panel list.');
    if(detailHost.querySelectorAll('.v42-cap.on').length<5)throw new Error('0427 advanced capability list incomplete.');
    setStage(1);detailHost.querySelector('[data-v42-use]').click();
  }else if(currentStage===1){
    const s=state();if(s.structure.template!=='fefco-0427')throw new Error(`Template did not persist: ${s.structure.template}`);
    const generator=await waitFor(()=>document.querySelector('[data-v41-generator]'),'Generator');
    const advanced=await waitFor(()=>generator.querySelector('.v42-advanced:not(.v42-disabled)'),'Advanced Structure');
    const values={flapTaper:8,notch:6,shoulder:10,relief:4,cornerRadius:3};
    for(const [key,value] of Object.entries(values)){const input=advanced.querySelector(`[data-v42-advanced="${key}"]`);if(!input)throw new Error(`Missing advanced control ${key}`);input.value=String(value)}
    setStage(2);generator.querySelector('[data-v41-apply]').click();
  }else if(currentStage===2){
    const s=state();for(const [key,value] of Object.entries({flapTaper:8,notch:6,shoulder:10,relief:4,cornerRadius:3}))if(Number(s.structure[key])!==value)throw new Error(`${key} did not persist: ${s.structure[key]}`);
    const g=generateGeometry(s.structure);
    if(g.advancedV42?.cornerRadiusMode!=='metadata-only-line-engine')throw new Error(`Corner radius mode mismatch: ${g.advancedV42?.cornerRadiusMode}`);
    if(!g.panelMap?.['lid-tuck']?.points?.length)throw new Error('Flap taper did not alter semantic panel geometry.');
    if(!g.advancedV42?.applied?.some(x=>x.kind==='roll-relief'))throw new Error('Fold relief did not alter CUT geometry.');
    document.querySelector('.tabbar [data-tab="Design"]')?.click();
    const labels=await waitFor(()=>document.querySelectorAll('.v42-panel-labels text').length>=4&&document.querySelector('.v42-panel-labels'),'semantic panel labels');
    if(!labels.textContent.includes('BASE'))throw new Error('Expected BASE semantic label missing.');
    const foldControls=await waitFor(()=>document.querySelector('.v42-fold-controls'),'Fold controls');
    foldControls.querySelector('[data-v42-fold-step="50"]').click();await sleep(80);if(Number(state().foldProgress)!==50)throw new Error('50% fold step did not persist.');
    foldControls.querySelector('[data-v42-fold-play]').click();await waitFor(()=>Number(state().foldProgress)>=99,'assembly animation',5000);
    if(!document.querySelector('.v42-resize-handle'))throw new Error('Resizable Inspector handle missing.');
    const text=`PASS template=${s.structure.template} taper=${s.structure.flapTaper} notch=${s.structure.notch} shoulder=${s.structure.shoulder} relief=${s.structure.relief} radiusMode=${g.advancedV42.cornerRadiusMode} fold=${state().foldProgress}`;
    document.body.dataset.pass=text;sessionStorage.setItem('boxstudio-v42-stage','done');await signal('pass',text);
  }else if(sessionStorage.getItem('boxstudio-v42-stage')!=='done')throw new Error(`Unexpected V0.42 E2E stage: ${currentStage}`);
}catch(error){const text=`FAIL stage=${sessionStorage.getItem('boxstudio-v42-stage')} ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
