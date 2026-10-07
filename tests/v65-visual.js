import {STORAGE_KEY,defaultState,stateForTemplate} from '../src/model.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error('visual timeout')};
const shot=new URLSearchParams(location.search).get('shot')||'artwork';
const advancedShots=['manufacturing','factory','routing'];
const map={structure:'Structure',artwork:'Design',marks:'Marks','3d':'3D',preflight:'Preflight',export:'Export',manufacturing:'3D',factory:'3D',routing:'3D',mobile:'Design'};
localStorage.clear();const p=stateForTemplate('fefco-0427',defaultState.variables),s=structuredClone(defaultState);s.structure=p.structure;s.elements=p.elements;s.variables=p.variables;s.selectedId=p.selectedId;s.foldProgress=100;s.page=shot==='templates'?'templates':'editor';s.editorTab=map[shot]||'Design';localStorage.setItem(STORAGE_KEY,JSON.stringify(s));if(advancedShots.includes(shot))localStorage.setItem('boxstudio-v58-advanced','1');
for(const m of ['../src/app.js','../src/v47Ui.js','../src/v48Ui.js','../src/v49Ui.js','../src/v50Ui.js','../src/v51Ui.js','../src/v52Ui.js','../src/v53Ui.js','../src/v54Ui.js','../src/uiRuntimeV64.js','../src/v55Ui.js','../src/v56Ui.js','../src/v57Ui.js','../src/v58Ui.js','../src/v59Ui.js','../src/v60Ui.js','../src/v61Ui.js','../src/v62Ui.js','../src/v63Ui.js','../src/v64Ui.js','../src/v65Ui.js'])await import(m);
const selectors={templates:'.v58-library-head',structure:'.workspace .main',artwork:'[data-v61-studio]',marks:'[data-v58-marks-studio]','3d':'#threeCanvas',preflight:'.workspace .main',export:'#exportPdf',manufacturing:'section[data-v55-manufacturing]',factory:'section[data-v56-factory]',routing:'section[data-v57-routing]',mobile:'[data-v61-studio]'};
const target=await waitFor(()=>document.querySelector(selectors[shot]||'[data-v63-stagebar]'));
async function isolateMountedSnapshot(node){
  const snapshot=node.cloneNode(true),top=document.querySelector('.topbar')?.cloneNode(true);
  snapshot.classList.remove('v58-advanced-production');snapshot.removeAttribute('hidden');snapshot.querySelectorAll('[hidden]').forEach(x=>x.removeAttribute('hidden'));
  snapshot.dataset.v65VisualFocus='true';snapshot.setAttribute('aria-label',`${shot} visual acceptance snapshot`);
  const topHtml=top?.outerHTML||'<div class="topbar"><div class="brand">BOXSTUDIO <small>V0.65</small></div></div>',moduleHtml=snapshot.outerHTML;
  window.BoxStudioUiRuntimeV64?.disconnect?.();
  document.body.innerHTML='';Object.assign(document.body.style,{visibility:'visible',overflow:'hidden',margin:'0',display:'block',background:'#f4f5f7'});
  const frame=document.createElement('iframe');frame.dataset.v65CaptureFrame='true';frame.title=`${shot} visual acceptance`;Object.assign(frame.style,{display:'block',width:'100vw',height:'100vh',border:'0',background:'#f4f5f7'});document.body.appendChild(frame);
  frame.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/v55Ui.css"><link rel="stylesheet" href="/src/v56Ui.css"><link rel="stylesheet" href="/src/v57Ui.css"><link rel="stylesheet" href="/src/v58Ui.css"><link rel="stylesheet" href="/src/v59Ui.css"><link rel="stylesheet" href="/src/v63Ui.css"><link rel="stylesheet" href="/src/v64Ui.css"><link rel="stylesheet" href="/src/v65Ui.css"><style>html,body{margin:0;min-height:100%;background:#f4f5f7;overflow:auto}.capture{padding:16px 22px 28px}.capture>[data-v65-visual-focus]{display:block!important;visibility:visible!important;opacity:1!important;position:static!important;inset:auto!important;margin:0!important;width:100%!important;max-width:none!important;max-height:calc(100vh - 92px)!important;overflow:auto!important;box-shadow:0 14px 42px rgba(20,28,38,.18)}.capture .v58-advanced-production{display:block!important}</style></head><body data-v58-studio="true" data-v58-advanced="true" data-v59-mode="professional" data-v64="true" data-v65="true">${topHtml}<main class="capture">${moduleHtml}</main></body></html>`;
  await new Promise(resolve=>{frame.onload=resolve;setTimeout(resolve,1500)});await sleep(500);
  return frame;
}
if(advancedShots.includes(shot)){
  await waitFor(()=>document.body.dataset.v58Advanced==='true');
  await waitFor(()=>window.BoxStudioV55&&window.BoxStudioV56&&window.BoxStudioV57);
  document.body.dataset.visualReady='true';
  await isolateMountedSnapshot(target);
}else if(shot==='templates')window.scrollTo(0,0);
await sleep(700);document.body.dataset.visualReady='true';document.body.dataset.visualShot=shot;
