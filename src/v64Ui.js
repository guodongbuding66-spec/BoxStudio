import { V64_PRODUCT_VERSION,V64_RETIREMENT_POLICY,runtimeAcceptanceV64 } from './runtimeV64.js';

const ADVANCED_KEY='boxstudio-v58-advanced';
const runtime=window.BoxStudioUiRuntimeV64;
function advancedOn(){return localStorage.getItem(ADVANCED_KEY)==='1'}
function syncAdvanced(){const on=advancedOn();document.body.dataset.v58Advanced=on?'true':'false';const b=document.querySelector('[data-v64-production]');if(b){b.classList.toggle('active',on);b.textContent=on?'收起高级生产':'高级生产'}}
function ensureVersion(){
  const brand=document.querySelector('.brand');if(!brand)return;
  let badge=brand.querySelector('[data-v64-version]');if(!badge){badge=document.createElement('span');badge.dataset.v64Version='true';badge.className='v64-version-badge';brand.appendChild(badge)}
  badge.textContent=V64_PRODUCT_VERSION;document.body.dataset.v64='true';
}
function retireLegacySurfaces(){for(const selector of V64_RETIREMENT_POLICY.retiredSelectors)document.querySelectorAll(selector).forEach(n=>n.remove())}
function ensureAdvancedAccess(){
  const actions=document.querySelector('[data-v63-inspector] .v63-inspector-actions');if(!actions||actions.querySelector('[data-v64-production]'))return;
  const button=document.createElement('button');button.dataset.v64Production='true';button.onclick=()=>{localStorage.setItem(ADVANCED_KEY,advancedOn()?'0':'1');syncAdvanced()};actions.appendChild(button);syncAdvanced();
}
function enhance(){ensureVersion();retireLegacySurfaces();ensureAdvancedAccess();syncAdvanced();const a=runtimeAcceptanceV64();document.body.dataset.v64Acceptance=a.ok?'pass':'fail'}

if(runtime?.register)runtime.register('v64',enhance);else enhance();
window.BoxStudioV64={version:V64_PRODUCT_VERSION,policy:V64_RETIREMENT_POLICY,getRuntimeStats:()=>runtime?.stats?.()||null,getAcceptance:runtimeAcceptanceV64,setAdvanced:on=>{localStorage.setItem(ADVANCED_KEY,on?'1':'0');syncAdvanced();return advancedOn()}};
