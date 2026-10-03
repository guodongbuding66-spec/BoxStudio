import { STORAGE_KEY, defaultState } from './model.js';

function readLockedVariables(){
  try{
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const state = parsed ? { ...structuredClone(defaultState), ...parsed } : structuredClone(defaultState);
    return new Set(Array.isArray(state.lockedVariables) ? state.lockedVariables : []);
  }catch{
    return new Set(defaultState.lockedVariables || []);
  }
}

function ensureStyle(){
  if(document.getElementById('boxstudio-variable-lock-style')) return;
  const style = document.createElement('style');
  style.id = 'boxstudio-variable-lock-style';
  style.textContent = `
    [data-profile-locked="true"]{background:#f5f6f7!important;color:#66707a!important;cursor:not-allowed!important;border-style:dashed!important}
    .profile-lock-badge{display:inline-flex;align-items:center;margin-left:6px;padding:1px 5px;border-radius:999px;background:#eef1f3;color:#66707a;font-size:9px;font-weight:700;letter-spacing:.04em;vertical-align:middle}
  `;
  document.head.appendChild(style);
}

function applyVariableLocks(){
  ensureStyle();
  const locked = readLockedVariables();
  document.querySelectorAll('[data-var]').forEach(control => {
    const key = control.dataset.var;
    const shouldLock = locked.has(key);
    if(shouldLock){
      control.setAttribute('data-profile-locked','true');
      control.setAttribute('aria-readonly','true');
      control.title = `Locked by customer profile: ${key}`;
      if('readOnly' in control) control.readOnly = true;
      else control.disabled = true;
      const label = control.closest('.field')?.querySelector('label');
      if(label && !label.querySelector('.profile-lock-badge')){
        const badge = document.createElement('span');
        badge.className = 'profile-lock-badge';
        badge.textContent = 'LOCKED';
        label.appendChild(badge);
      }
    }else if(control.getAttribute('data-profile-locked') === 'true'){
      control.removeAttribute('data-profile-locked');
      control.removeAttribute('aria-readonly');
      control.removeAttribute('title');
      if('readOnly' in control) control.readOnly = false;
      else control.disabled = false;
      control.closest('.field')?.querySelector('.profile-lock-badge')?.remove();
    }
  });
}

const observer = new MutationObserver(applyVariableLocks);
observer.observe(document.documentElement,{childList:true,subtree:true});
applyVariableLocks();
