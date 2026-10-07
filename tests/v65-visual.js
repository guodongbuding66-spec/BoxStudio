import {STORAGE_KEY,defaultState,stateForTemplate} from '../src/model.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error('visual timeout')};
const shot=new URLSearchParams(location.search).get('shot')||'artwork';
const advancedShots=['manufacturing','factory','routing'];
const map={structure:'Structure',artwork:'Design',marks:'Marks','3d':'3D',preflight:'Preflight',export:'Export',manufacturing:'3D',factory:'3D',routing:'3D',mobile:'Design'};
localStorage.clear();const p=stateForTemplate('fefco-0427',defaultState.variables),s=structuredClone(defaultState);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;s.selectedId=p.selectedId;s.foldProgress=100;s.page=shot==='templates'?'templates':'editor';s.editorTab=map[shot]||'Design';localStorage.setItem(STORAGE_KEY,JSON.stringify(s));if(advancedShots.includes(shot))localStorage.setItem('boxstudio-v58-advanced','1');
for(const m of ['../src/app.js','../src/v47Ui.js','../src/v48Ui.js','../src/v49Ui.js','../src/v50Ui.js','../src/v51Ui.js','../src/v52Ui.js','../src/v53Ui.js','../src/v54Ui.js','../src/uiRuntimeV64.js','../src/v55Ui.js','../src/v56Ui.js','../src/v57Ui.js','../src/v58Ui.js','../src/v59Ui.js','../src/v60Ui.js','../src/v61Ui.js','../src/v62Ui.js','../src/v63Ui.js','../src/v64Ui.js','../src/v65Ui.js'])await import(m);
const selectors={templates:'.v58-library-head',structure:'.workspace .main',artwork:'[data-v61-studio]',marks:'[data-v58-marks-studio]','3d':'#threeCanvas',preflight:'.workspace .main',export:'#exportPdf',manufacturing:'[data-v55-manufacturing]',factory:'[data-v56-factory]',routing:'[data-v57-routing]',mobile:'[data-v61-studio]'};
const target=await waitFor(()=>document.querySelector(selectors[shot]||'[data-v63-stagebar]'));
function isolateMountedSnapshot(node){
  const snapshot=node.cloneNode(true),top=document.querySelector('.topbar')?.cloneNode(true);
  snapshot.classList.remove('v58-advanced-production');
  snapshot.dataset.v65VisualFocus='true';
  snapshot.setAttribute('aria-label',`${shot} visual acceptance snapshot`);
  window.BoxStudioUiRuntimeV64?.disconnect?.();
  document.body.innerHTML='';
  Object.assign(document.body.style,{visibility:'visible',overflow:'auto',background:'#f4f5f7',margin:'0',display:'block'});
  if(top){top.style.position='relative';top.style.zIndex='2';document.body.appendChild(top)}
  const stage=document.createElement('main');stage.dataset.v65CaptureStage='true';Object.assign(stage.style,{padding:'16px 22px 24px',minHeight:'calc(100vh - 54px)',background:'#f4f5f7'});
  Object.assign(snapshot.style,{display:'block',visibility:'visible',opacity:'1',position:'relative',inset:'auto',zIndex:'1',margin:'0',width:'100%',maxWidth:'none',maxHeight:'calc(100vh - 92px)',overflow:'auto',boxShadow:'0 14px 42px rgba(20,28,38,.18)'});
  stage.appendChild(snapshot);document.body.appendChild(stage);
  return snapshot;
}
if(advancedShots.includes(shot)){
  await waitFor(()=>document.body.dataset.v58Advanced==='true');
  await waitFor(()=>window.BoxStudioV55&&window.BoxStudioV56&&window.BoxStudioV57);
  document.body.dataset.visualReady='true';
  isolateMountedSnapshot(target);
}else if(shot==='templates')window.scrollTo(0,0);
await sleep(700);document.body.dataset.visualReady='true';document.body.dataset.visualShot=shot;
