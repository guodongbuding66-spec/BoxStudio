import { V65_PRODUCT_VERSION,runtimeAcceptanceV65 } from './runtimeV65.js';
const runtime=window.BoxStudioUiRuntimeV64;
function ensureVersion(){const brand=document.querySelector('.brand');if(!brand)return;let badge=brand.querySelector('[data-v65-version]');if(!badge){badge=document.createElement('span');badge.dataset.v65Version='true';badge.className='v65-version-badge';brand.appendChild(badge)}if(badge.textContent!==V65_PRODUCT_VERSION)badge.textContent=V65_PRODUCT_VERSION;document.body.dataset.v65='true'}
function enhance(){ensureVersion();const a=runtimeAcceptanceV65(runtime?.stats?.()||null);document.body.dataset.v65Acceptance=a.ok?'pass':'fail'}
if(runtime?.register)runtime.register('v65',enhance);else enhance();
window.BoxStudioV65={version:V65_PRODUCT_VERSION,getRuntimeStats:()=>runtime?.stats?.()||null,getAcceptance:()=>runtimeAcceptanceV65(runtime?.stats?.()||null)};
