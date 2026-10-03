import { STORAGE_KEY, defaultState } from './model.js';
import { CUSTOMER_PROFILES, applyCustomerProfile } from './customerProfiles.js';
import { MARK_TEMPLATES, applyMarkTemplate } from './markTemplates.js';
import { PACKAGING_RULE_PROFILES } from './rules.js';
import { createMasterTemplate, applyMasterTemplate, serializeMasterTemplate, parseMasterTemplate } from './masterTemplates.js';

const BUTTON_ID = 'boxstudio-profile-manager-button';
const DRAWER_ID = 'boxstudio-profile-manager';

function readState(){
  try{
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed ? { ...structuredClone(defaultState), ...parsed } : structuredClone(defaultState);
  }catch{
    return structuredClone(defaultState);
  }
}

function writeState(state){
  state.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(value=''){
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function downloadText(name, text){
  const blob = new Blob([text], { type:'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function renderDrawer(){
  document.getElementById(DRAWER_ID)?.remove();
  const state = readState();
  const masters = Array.isArray(state.masterTemplates) ? state.masterTemplates : [];
  const root = document.createElement('div');
  root.id = DRAWER_ID;
  root.className = 'profile-manager-backdrop';
  root.innerHTML = `
    <section class="profile-manager-card" role="dialog" aria-modal="true" aria-label="Profiles and Master Templates">
      <header class="profile-manager-head">
        <div><strong>Profiles & Master Templates</strong><span>BoxStudio V0.10</span></div>
        <button type="button" data-close aria-label="Close">×</button>
      </header>
      <div class="profile-manager-scroll">
        <div class="profile-section">
          <h3>Customer Profile</h3>
          <p>应用客户默认值、锁定变量和 Packaging Rule Profile。</p>
          <select id="profileCustomer">${Object.values(CUSTOMER_PROFILES).map(p=>`<option value="${esc(p.id)}" ${state.customerProfileId===p.id?'selected':''}>${esc(p.label)}</option>`).join('')}</select>
          <button type="button" class="profile-primary" data-apply-customer>Apply Customer Profile</button>
        </div>
        <div class="profile-section profile-grid-2">
          <label><span>Packaging Rule</span><select id="profileRule">${Object.values(PACKAGING_RULE_PROFILES).map(p=>`<option value="${esc(p.id)}" ${state.packagingRuleProfileId===p.id?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label>
          <label><span>Mark Template</span><select id="profileMark">${Object.values(MARK_TEMPLATES).map(p=>`<option value="${esc(p.id)}" ${state.markTemplateId===p.id?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label>
          <button type="button" data-apply-rules>Apply Rule + Mark Template</button>
        </div>
        <div class="profile-section">
          <h3>Create Master Template</h3>
          <p>保存当前结构、唛头位置、导出设置和客户规则；默认保留实际 SKU/重量/箱号等订单数据为运行时变量。</p>
          <div class="profile-inline"><input id="profileMasterName" value="${esc(state.projectName || 'Master Template')}" placeholder="Master template name"><button type="button" class="profile-primary" data-save-master>Save Snapshot</button></div>
          <div class="profile-inline"><label class="profile-file">Import JSON<input id="profileImport" type="file" accept="application/json,.json"></label></div>
        </div>
        <div class="profile-section">
          <h3>Saved Master Templates <small>${masters.length}</small></h3>
          <div class="profile-master-list">${masters.length ? masters.map((m,index)=>`
            <article class="profile-master-item">
              <div><strong>${esc(m.label || m.id)}</strong><span>${esc(m.customerProfileId || 'generic')} · ${esc(m.packagingRuleProfileId || 'generic')} · ${esc(m.markTemplateId || 'no mark template')}</span></div>
              <div class="profile-master-actions">
                <button type="button" data-master-apply="${index}">Apply</button>
                <button type="button" data-master-export="${index}">Export</button>
                <button type="button" class="danger" data-master-delete="${index}">Delete</button>
              </div>
            </article>`).join('') : '<div class="profile-empty">No saved master templates yet.</div>'}</div>
        </div>
      </div>
    </section>`;
  document.body.appendChild(root);

  root.querySelector('[data-close]').onclick = () => root.remove();
  root.onclick = event => { if(event.target === root) root.remove(); };

  root.querySelector('[data-apply-customer]').onclick = () => {
    let next = readState();
    next = applyCustomerProfile(next, root.querySelector('#profileCustomer').value, { overwriteDefaults:true });
    writeState(next);
    location.reload();
  };

  root.querySelector('[data-apply-rules]').onclick = () => {
    let next = readState();
    next.packagingRuleProfileId = root.querySelector('#profileRule').value;
    next = applyMarkTemplate(next, root.querySelector('#profileMark').value);
    writeState(next);
    location.reload();
  };

  root.querySelector('[data-save-master]').onclick = () => {
    const next = readState();
    const label = root.querySelector('#profileMasterName').value.trim() || 'Master Template';
    const master = createMasterTemplate(next, { label });
    next.masterTemplates = [...(Array.isArray(next.masterTemplates)?next.masterTemplates:[]), master];
    writeState(next);
    renderDrawer();
  };

  root.querySelector('#profileImport').onchange = async event => {
    const file = event.target.files?.[0];
    if(!file) return;
    try{
      const master = parseMasterTemplate(await file.text());
      const next = readState();
      next.masterTemplates = [...(Array.isArray(next.masterTemplates)?next.masterTemplates:[]), master];
      writeState(next);
      renderDrawer();
    }catch(err){
      alert(`Master template import failed: ${err?.message || err}`);
    }
  };

  root.querySelectorAll('[data-master-apply]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterApply);
    const current = readState();
    const master = current.masterTemplates?.[index];
    if(!master) return;
    const next = applyMasterTemplate(current, master, { preserveVariables:true });
    next.masterTemplates = current.masterTemplates;
    writeState(next);
    location.reload();
  });

  root.querySelectorAll('[data-master-export]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterExport);
    const master = readState().masterTemplates?.[index];
    if(!master) return;
    const safe = String(master.label || master.id || 'master-template').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'') || 'master-template';
    downloadText(`${safe}.json`, serializeMasterTemplate(master));
  });

  root.querySelectorAll('[data-master-delete]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterDelete);
    const next = readState();
    next.masterTemplates = (next.masterTemplates || []).filter((_,i)=>i!==index);
    writeState(next);
    renderDrawer();
  });
}

function installButton(){
  if(document.getElementById(BUTTON_ID)) return;
  const topbar = document.querySelector('.topbar');
  if(!topbar) return;
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = 'profile-manager-trigger';
  button.textContent = 'Profiles';
  button.title = 'Customer Profiles & Master Templates';
  button.onclick = renderDrawer;
  const exportButton = topbar.querySelector('#quickExport');
  if(exportButton) topbar.insertBefore(button, exportButton); else topbar.appendChild(button);
}

const observer = new MutationObserver(installButton);
observer.observe(document.documentElement, { childList:true, subtree:true });
installButton();
