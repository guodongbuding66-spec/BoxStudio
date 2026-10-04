import { STORAGE_KEY, defaultState } from '../src/model.js';

const log=document.getElementById('v36E2ELog');
const tick=(ms=120)=>new Promise(resolve=>setTimeout(resolve,ms));
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch{}}
function requireEl(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}
async function waitFor(fn,label,{tries=80,delay=100}={}){for(let i=0;i<tries;i++){const value=fn();if(value)return value;await tick(delay)}throw new Error(`Timed out waiting for ${label}`)}
function savedState(){return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}
async function loginAs(email,password,label){const button=await waitFor(()=>{const el=document.querySelector('#v36Login');return el&&!el.disabled?el:null},`${label} login ready`);requireEl('#v36Email').value=email;requireEl('#v36Password').value=password;button.click();await waitFor(()=>document.body.textContent.includes(label),`${label} session`);}

await signal('/__v36_started__','detail','driver-loaded');
try{
  localStorage.clear();const seed=structuredClone(defaultState);seed.projectName='Hosted Browser Demo';seed.variables.sku='BROWSER-V36-001';localStorage.setItem(STORAGE_KEY,JSON.stringify(seed));
  await import('../src/v36Ui.js');await tick();
  requireEl('#v36OpenHosted').click();
  await loginAs('alice@example.test','operator-1234','Alice Operator');
  const sync=await waitFor(()=>{const el=document.querySelector('#v36Sync');return el&&!el.disabled?el:null},'sync button');sync.click();
  await waitFor(()=>document.body.textContent.includes('Hosted Browser Demo'),'hosted project after sync');
  const submit=await waitFor(()=>document.querySelector('[data-v36-action="submit"]'),'submit action');submit.click();
  await waitFor(()=>document.body.textContent.includes('submitted'),'submitted status');
  let local=savedState();if(local.projectId!=='hosted-browser-demo'||local.projectRemoteRevision!==1)throw new Error(`Local hosted identity not persisted: ${local.projectId} r${local.projectRemoteRevision}`);

  requireEl('#v36Logout').click();await loginAs('bob@example.test','approver-1234','Bob Approver');
  await waitFor(()=>document.body.textContent.includes('Hosted Browser Demo'),'project visible to approver');
  requireEl('#v36Reason').value='approved in browser e2e';const approve=await waitFor(()=>document.querySelector('[data-v36-action="approve"]'),'approve action');approve.click();
  await waitFor(()=>document.body.textContent.includes('approved'),'approved status');
  await waitFor(()=>document.body.textContent.includes('revision.approved'),'approval audit event');
  if(!document.body.textContent.includes('approver'))throw new Error('Server role was not displayed in hosted UI.');
  if(document.querySelector('[data-v36-action="approve"]'))throw new Error('Approved revision still exposes approve action.');

  const detail='PASS hosted-ui operator-sync-submit approver-approve audit-visible';document.body.dataset.v36E2e='pass';log.textContent=detail;await signal('/__v36_pass__','detail',detail);
}catch(error){const message=String(error?.stack||error);document.body.dataset.v36E2e='fail';log.textContent=`FAIL ${message}`;console.error(error);await signal('/__v36_fail__','message',message)}
