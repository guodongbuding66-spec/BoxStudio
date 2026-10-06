import { STORAGE_KEY } from '../src/model.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const value=fn();if(value)return value}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v47_${kind}__`,{method:'POST',body:text})}catch{}};
const click=node=>node?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const readState=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');

try{
  const api=await waitFor(()=>window.BoxStudioV47,'BoxStudioV47 API');
  if(!api.allFeaturesFree||!api.noLoginRequired||!api.noWatermark)throw new Error('Free-access policy flags are not active.');
  await waitFor(()=>document.querySelector('.v47-free-pill'),'free pill');
  await waitFor(()=>document.querySelector('.v47-hero'),'dashboard hero');
  const bodyText=document.body.textContent.toLowerCase();for(const bad of ['subscribe now','upgrade plan','pricing required','登录后下载','付费后下载'])if(bodyText.includes(bad))throw new Error(`Unexpected paywall wording: ${bad}`);

  click(document.querySelector('[data-nav="templates"]'));
  await waitFor(()=>document.querySelector('.v47-template-shell'),'template library shell');
  const search=document.querySelector('[data-v47-template-search]');search.value='0427';search.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'0427'}));
  await sleep(80);
  const visibleCards=[...document.querySelectorAll('main.page .cards>.card[data-v47-card]')].filter(x=>getComputedStyle(x).display!=='none');if(!visibleCards.length)throw new Error('Template search returned no results for 0427.');if(!visibleCards.every(x=>x.textContent.toLowerCase().includes('0427')))throw new Error('Template search did not filter cards strictly.');
  search.value='';search.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));click(document.querySelector('[data-v47-category="mailer"]'));await sleep(60);const mailerCards=[...document.querySelectorAll('main.page .cards>.card[data-v47-card]')].filter(x=>getComputedStyle(x).display!=='none');if(!mailerCards.length)throw new Error('Mailer category filter returned no templates.');if(!mailerCards.every(x=>x.dataset.v47Category==='mailer'))throw new Error('Mailer category filter leaked another category.');

  const use0427=[...document.querySelectorAll('[data-use-template="fefco-0427"]')][0];if(!use0427)throw new Error('FEFCO 0427 actionable template missing.');click(use0427);
  await waitFor(()=>document.querySelector('.workspace'),'editor workspace');
  await waitFor(()=>document.querySelector('.v47-workflow'),'seven-step workflow');
  if(document.querySelectorAll('.v47-workflow .v47-step').length!==7)throw new Error('Expected seven workflow steps.');
  const dimensions=await waitFor(()=>document.querySelector('.v47-dimension-card'),'dimension card');const dimText=dimensions.textContent;if(!dimText.includes('内尺寸')||!dimText.includes('制造尺寸')||!dimText.includes('外尺寸'))throw new Error('Three-size dimension system is not visible.');
  await waitFor(()=>document.querySelector('.v47-line-legend'),'line legend');
  await waitFor(()=>document.querySelector('.v47-preview-launch'),'3D launch panel');

  click(document.querySelector('[data-tab="Marks"]'));await waitFor(()=>document.querySelector('.v47-mark-actions'),'mark quick actions');if(document.querySelectorAll('.v47-mark-action').length!==4)throw new Error('Mark quick actions are incomplete.');
  if(!document.body.textContent.includes('条码 + QR'))throw new Error('Barcode + QR quick action missing.');

  click(document.querySelector('[data-tab="Export"]'));const free=await waitFor(()=>document.querySelector('.v47-free-export'),'free export notice');if(!free.textContent.includes('永久免费'))throw new Error('Free export notice missing.');
  const exports=[...document.querySelectorAll('#exportSvg,#exportPdf,#exportDxf,#exportPng')];if(exports.length<4)throw new Error('Expected SVG/PDF/DXF/PNG export controls.');if(exports.some(x=>x.disabled))throw new Error('A production export control is disabled.');if(exports.some(x=>x.dataset.v47Free!=='true'))throw new Error('Export control is not marked as free.');
  const forbidden=[...document.querySelectorAll('a,button')].filter(x=>/pricing|subscribe|upgrade|paywall/i.test(`${x.textContent} ${x.getAttribute('href')||''}`));if(forbidden.length)throw new Error(`Unexpected pricing/paywall UI: ${forbidden.map(x=>x.textContent.trim()).join(', ')}`);

  const state=readState();if(state.structure.template!=='fefco-0427')throw new Error(`Template workflow did not persist selected template: ${state.structure.template}`);
  const text=`PASS free=true templateSearch=0427 mailerFilter=${mailerCards.length} workflow=7 dimensions=3 marks=4 exports=${exports.length} template=${state.structure.template}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
