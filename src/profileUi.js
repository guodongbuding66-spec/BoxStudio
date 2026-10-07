import {setUiVersion} from './uiVersion.js';
import { STORAGE_KEY, defaultState } from './model.js';
import { getCustomerProfileCatalog, applyCustomerProfile, saveCustomCustomerProfile, deleteCustomCustomerProfile } from './customerProfiles.js';
import { getMarkTemplateCatalog, applyMarkTemplate, createMarkTemplateFromState, saveCustomMarkTemplate, deleteCustomMarkTemplate } from './markTemplates.js';
import { getPackagingRuleCatalog, saveCustomPackagingRule, deleteCustomPackagingRule } from './rules.js';
import {
  createMasterTemplate,
  applyMasterTemplate,
  serializeMasterTemplate,
  parseMasterTemplate,
  renameMasterTemplate,
  duplicateMasterTemplate,
  createMasterRevision,
  listMasterRevisions,
  restoreMasterRevision,
} from './masterTemplates.js';

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

function parseFixedVariables(text=''){
  const out = {};
  for(const line of String(text).split(/\r?\n/)){
    const at = line.indexOf('=');
    if(at < 1) continue;
    const key = line.slice(0,at).trim();
    const value = line.slice(at+1).trim();
    if(key) out[key] = value;
  }
  return out;
}

function profileOptions(catalog, selected){
  return Object.values(catalog).map(p=>`<option value="${esc(p.id)}" ${selected===p.id?'selected':''}>${esc(p.label)}${p.custom?' · Custom':''}</option>`).join('');
}

function renderMasterItem(master,index){
  const revisions = listMasterRevisions(master);
  return `<article class="profile-master-item v11-master">
    <div class="profile-master-summary">
      <div><strong>${esc(master.label || master.id)}</strong><span>r${master.revision || 1} · ${esc(master.customerProfileId || 'generic')} · ${esc(master.packagingRuleProfileId || 'generic')} · ${esc(master.markTemplateId || 'no mark template')}</span></div>
      <div class="profile-master-actions">
        <button type="button" data-master-apply="${index}">Apply</button>
        <button type="button" data-master-revision="${index}">Save Revision</button>
        <button type="button" data-master-rename="${index}">Rename</button>
        <button type="button" data-master-duplicate="${index}">Duplicate</button>
        <button type="button" data-master-export="${index}">Export</button>
        <button type="button" class="danger" data-master-delete="${index}">Delete</button>
      </div>
    </div>
    <details class="master-history"><summary>Version history · ${revisions.length} revision(s)</summary>
      ${revisions.map(r=>`<div class="master-revision-row"><span><b>r${r.revision}</b> ${esc(r.revisionNote || '')}</span><small>${esc(r.updatedAt || '')}</small>${r.current?'<em>Current</em>':`<button type="button" data-master-restore="${index}" data-master-restore-revision="${r.revision}">Restore</button>`}</div>`).join('')}
    </details>
  </article>`;
}

function renderDrawer(){
  document.getElementById(DRAWER_ID)?.remove();
  const state = readState();
  const masters = Array.isArray(state.masterTemplates) ? state.masterTemplates : [];
  const customerCatalog = getCustomerProfileCatalog(state);
  const ruleCatalog = getPackagingRuleCatalog(state);
  const markCatalog = getMarkTemplateCatalog(state);
  const customCustomers = Object.values(state.customCustomerProfiles || {});
  const customRules = Object.values(state.customPackagingRules || {});
  const customMarks = Object.values(state.customMarkTemplates || {});
  const root = document.createElement('div');
  root.id = DRAWER_ID;
  root.className = 'profile-manager-backdrop';
  root.innerHTML = `
    <section class="profile-manager-card v11-profile-card" role="dialog" aria-modal="true" aria-label="Profiles and Master Templates">
      <header class="profile-manager-head">
        <div><strong>Profiles & Master Templates</strong><span>BoxStudio V0.11</span></div>
        <button type="button" data-close aria-label="Close">×</button>
      </header>
      <div class="profile-manager-scroll">
        <div class="profile-section">
          <h3>Active Production Profile</h3>
          <p>客户默认值、Packaging Rule、Mark Template 和锁定变量统一管理。</p>
          <div class="profile-grid-2">
            <label><span>Customer Profile</span><select id="profileCustomer">${profileOptions(customerCatalog,state.customerProfileId)}</select></label>
            <label><span>Packaging Rule</span><select id="profileRule">${profileOptions(ruleCatalog,state.packagingRuleProfileId)}</select></label>
            <label><span>Mark Template</span><select id="profileMark">${profileOptions(markCatalog,state.markTemplateId)}</select></label>
          </div>
          <div class="profile-inline"><button type="button" class="profile-primary" data-apply-customer>Apply Customer Profile</button><button type="button" data-apply-rules>Apply Rule + Mark Template</button></div>
        </div>

        <details class="profile-section v11-builder">
          <summary><b>Customer Profile Builder</b> · 创建客户固定字段和锁定策略</summary>
          <div class="profile-grid-2">
            <label><span>Name</span><input id="customCustomerLabel" placeholder="Example: Retailer A US"></label>
            <label><span>Profile ID</span><input id="customCustomerId" placeholder="retailer-a-us"></label>
            <label><span>Packaging Rule</span><select id="customCustomerRule">${profileOptions(ruleCatalog,'generic')}</select></label>
            <label><span>Preferred Mark Template</span><select id="customCustomerMark"><option value="">None</option>${Object.values(markCatalog).map(p=>`<option value="${esc(p.id)}">${esc(p.label)}${p.custom?' · Custom':''}</option>`).join('')}</select></label>
            <label><span>Origin Country</span><input id="customOrigin" value="China"></label>
            <label><span>Destination Country</span><input id="customDestination" value="US"></label>
            <label><span>Dimension Unit</span><select id="customDimensionUnit"><option>INCH</option><option>MM</option><option>CM</option></select></label>
            <label><span>Weight Unit</span><select id="customWeightUnit"><option>LBS</option><option>KG</option></select></label>
          </div>
          <label class="profile-stack"><span>Locked variables · comma separated</span><input id="customLockedVariables" value="originCountry,destinationCountry,dimensionUnit,weightUnit"></label>
          <button type="button" class="profile-primary" data-save-customer>Save Custom Customer Profile</button>
          ${customCustomers.length?`<div class="custom-profile-list">${customCustomers.map(p=>`<div><span><b>${esc(p.label)}</b><small>${esc(p.id)}</small></span><button type="button" class="danger" data-delete-customer="${esc(p.id)}">Delete</button></div>`).join('')}</div>`:''}
        </details>

        <details class="profile-section v11-builder">
          <summary><b>Packaging Rule Builder</b> · 只保存已确认的生产规则，不自动猜测工厂补偿</summary>
          <div class="profile-grid-2">
            <label><span>Name</span><input id="customRuleLabel" placeholder="Example: Retailer A Carton Rule"></label>
            <label><span>Rule ID</span><input id="customRuleId" placeholder="retailer-a-carton"></label>
            <label><span>Required variables</span><input id="customRequired" value="sku,nw,gw,crn,contractNo,originCountry,destinationCountry"></label>
            <label><span>Minimum CRN bindings</span><input id="customCrnBindings" type="number" min="0" value="2"></label>
            <label><span>Barcode+QR ratio</span><input id="customBarcodeRatio" type="number" step="0.001" value="3.125"></label>
            <label><span>Allowed presets</span><input id="customBarcodePresets" value="250x80,200x64"></label>
          </div>
          <div class="profile-checks"><label><input id="customPackageNotice" type="checkbox" checked> Multi-package notice required</label><label><input id="customBarcodeRequired" type="checkbox" checked> Barcode + QR required</label><label><input id="customAspectLock" type="checkbox" checked> Aspect lock required</label></div>
          <label class="profile-stack"><span>Fixed variables · one key=value per line</span><textarea id="customFixedVariables" placeholder="destinationCountry=US"></textarea></label>
          <button type="button" class="profile-primary" data-save-rule>Save Custom Packaging Rule</button>
          ${customRules.length?`<div class="custom-profile-list">${customRules.map(p=>`<div><span><b>${esc(p.label)}</b><small>${esc(p.id)}</small></span><button type="button" class="danger" data-delete-rule="${esc(p.id)}">Delete</button></div>`).join('')}</div>`:''}
        </details>

        <details class="profile-section v11-builder">
          <summary><b>Mark Template Builder</b> · 保存当前唛头元素、位置、变量绑定和 Barcode+QR 规格</summary>
          <div class="profile-grid-2">
            <label><span>Name</span><input id="customMarkLabel" placeholder="Example: Retailer A Marks"></label>
            <label><span>Template ID</span><input id="customMarkId" placeholder="retailer-a-marks"></label>
          </div>
          <label class="profile-stack"><span>Description</span><input id="customMarkDescription" placeholder="Customer-approved shipping-mark layout"></label>
          <button type="button" class="profile-primary" data-save-mark>Save Current Marks as Template</button>
          ${customMarks.length?`<div class="custom-profile-list">${customMarks.map(p=>`<div><span><b>${esc(p.label)}</b><small>${esc(p.id)} · ${p.elements?.length||0} elements</small></span><button type="button" class="danger" data-delete-mark="${esc(p.id)}">Delete</button></div>`).join('')}</div>`:''}
        </details>

        <div class="profile-section">
          <h3>Create Master Template</h3>
          <p>保存当前结构、唛头位置、导出设置和客户规则；SKU、重量、CRN、箱号等继续作为运行时订单数据。</p>
          <div class="profile-inline"><input id="profileMasterName" value="${esc(state.projectName || 'Master Template')}" placeholder="Master template name"><button type="button" class="profile-primary" data-save-master>Save New Master</button></div>
          <div class="profile-inline"><label class="profile-file">Import JSON<input id="profileImport" type="file" accept="application/json,.json"></label></div>
        </div>

        <div class="profile-section">
          <h3>Saved Master Templates <small>${masters.length}</small></h3>
          <div class="profile-master-list">${masters.length ? masters.map(renderMasterItem).join('') : '<div class="profile-empty">No saved master templates yet.</div>'}</div>
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

  root.querySelector('[data-save-customer]').onclick = () => {
    try{
      let next = readState();
      const label = root.querySelector('#customCustomerLabel').value.trim();
      if(!label) throw new Error('Customer profile name is required.');
      next = saveCustomCustomerProfile(next, {
        id: root.querySelector('#customCustomerId').value.trim() || label,
        label,
        packagingRuleProfileId: root.querySelector('#customCustomerRule').value,
        preferredMarkTemplateId: root.querySelector('#customCustomerMark').value || null,
        defaultVariables:{
          originCountry:root.querySelector('#customOrigin').value.trim(),
          destinationCountry:root.querySelector('#customDestination').value.trim(),
          dimensionUnit:root.querySelector('#customDimensionUnit').value,
          weightUnit:root.querySelector('#customWeightUnit').value,
        },
        lockedVariables:root.querySelector('#customLockedVariables').value.split(',').map(v=>v.trim()).filter(Boolean),
      });
      writeState(next); renderDrawer();
    }catch(err){ alert(err?.message || err); }
  };

  root.querySelector('[data-save-rule]').onclick = () => {
    try{
      let next = readState();
      const label = root.querySelector('#customRuleLabel').value.trim();
      if(!label) throw new Error('Packaging rule name is required.');
      next = saveCustomPackagingRule(next, {
        id:root.querySelector('#customRuleId').value.trim() || label,
        label,
        requiredVariables:root.querySelector('#customRequired').value.split(',').map(v=>v.trim()).filter(Boolean),
        requireCrnBindings:Number(root.querySelector('#customCrnBindings').value)||0,
        packageNoticeWhenMultiple:root.querySelector('#customPackageNotice').checked,
        fixedVariables:parseFixedVariables(root.querySelector('#customFixedVariables').value),
        barcodeQr:{
          required:root.querySelector('#customBarcodeRequired').checked,
          allowedPresets:root.querySelector('#customBarcodePresets').value.split(',').map(v=>v.trim()).filter(Boolean),
          ratio:Number(root.querySelector('#customBarcodeRatio').value)||3.125,
          ratioTolerance:0.03,
          requireLockAspect:root.querySelector('#customAspectLock').checked,
        },
      });
      writeState(next); renderDrawer();
    }catch(err){ alert(err?.message || err); }
  };

  root.querySelector('[data-save-mark]').onclick = () => {
    try{
      let next=readState();
      const label=root.querySelector('#customMarkLabel').value.trim();
      if(!label) throw new Error('Mark template name is required.');
      const mark=createMarkTemplateFromState(next,{
        id:root.querySelector('#customMarkId').value.trim()||label,
        label,
        description:root.querySelector('#customMarkDescription').value.trim(),
      });
      next=saveCustomMarkTemplate(next,mark);writeState(next);renderDrawer();
    }catch(err){alert(err?.message||err)}
  };

  root.querySelectorAll('[data-delete-customer]').forEach(button => button.onclick = () => {
    if(!confirm('Delete this custom customer profile?')) return;
    try{ writeState(deleteCustomCustomerProfile(readState(), button.dataset.deleteCustomer)); renderDrawer(); }catch(err){ alert(err?.message||err); }
  });
  root.querySelectorAll('[data-delete-rule]').forEach(button => button.onclick = () => {
    if(!confirm('Delete this custom packaging rule?')) return;
    try{ writeState(deleteCustomPackagingRule(readState(), button.dataset.deleteRule)); renderDrawer(); }catch(err){ alert(err?.message||err); }
  });
  root.querySelectorAll('[data-delete-mark]').forEach(button => button.onclick = () => {
    if(!confirm('Delete this custom mark template?')) return;
    try{ writeState(deleteCustomMarkTemplate(readState(), button.dataset.deleteMark)); renderDrawer(); }catch(err){ alert(err?.message||err); }
  });

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
      const exists = (next.masterTemplates || []).some(item=>item.id===master.id);
      master.id = exists ? `master-${Date.now()}` : master.id;
      next.masterTemplates = [...(Array.isArray(next.masterTemplates)?next.masterTemplates:[]), master];
      writeState(next);
      renderDrawer();
    }catch(err){ alert(`Master template import failed: ${err?.message || err}`); }
  };

  root.querySelectorAll('[data-master-apply]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterApply);
    const current = readState();
    const master = current.masterTemplates?.[index];
    if(!master) return;
    const next = applyMasterTemplate(current, master, { preserveVariables:true });
    next.masterTemplates = current.masterTemplates;
    next.customCustomerProfiles = current.customCustomerProfiles || {};
    next.customPackagingRules = current.customPackagingRules || {};
    next.customMarkTemplates = current.customMarkTemplates || {};
    next.batch = current.batch || next.batch;
    writeState(next);
    location.reload();
  });

  root.querySelectorAll('[data-master-revision]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterRevision);
    const next = readState();
    const master = next.masterTemplates?.[index];
    if(!master) return;
    const note = prompt('Revision note:', `Revision ${(master.revision||1)+1}`);
    if(note === null) return;
    next.masterTemplates[index] = createMasterRevision(master, next, { note });
    writeState(next); renderDrawer();
  });

  root.querySelectorAll('[data-master-rename]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterRename);
    const next = readState();
    const master = next.masterTemplates?.[index];
    if(!master) return;
    const label = prompt('Master template name:', master.label || master.id);
    if(label === null) return;
    try{ next.masterTemplates[index] = renameMasterTemplate(master,label); writeState(next); renderDrawer(); }catch(err){ alert(err?.message||err); }
  });

  root.querySelectorAll('[data-master-duplicate]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterDuplicate);
    const next = readState();
    const master = next.masterTemplates?.[index];
    if(!master) return;
    next.masterTemplates.push(duplicateMasterTemplate(master));
    writeState(next); renderDrawer();
  });

  root.querySelectorAll('[data-master-restore]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterRestore);
    const revision = Number(button.dataset.masterRestoreRevision);
    const next = readState();
    const master = next.masterTemplates?.[index];
    if(!master || !confirm(`Restore revision ${revision} as a new revision?`)) return;
    try{ next.masterTemplates[index] = restoreMasterRevision(master, revision); writeState(next); renderDrawer(); }catch(err){ alert(err?.message||err); }
  });

  root.querySelectorAll('[data-master-export]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterExport);
    const master = readState().masterTemplates?.[index];
    if(!master) return;
    const safe = String(master.label || master.id || 'master-template').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'') || 'master-template';
    downloadText(`${safe}-r${master.revision||1}.json`, serializeMasterTemplate(master));
  });

  root.querySelectorAll('[data-master-delete]').forEach(button => button.onclick = () => {
    const index = Number(button.dataset.masterDelete);
    if(!confirm('Delete this Master Template and its revision history?')) return;
    const next = readState();
    const deletedId = next.masterTemplates?.[index]?.id;
    next.masterTemplates = (next.masterTemplates || []).filter((_,i)=>i!==index);
    if(next.batch?.masterTemplateId === deletedId) next.batch.masterTemplateId = '';
    writeState(next);
    renderDrawer();
  });
}

function installButton(){
  const visibleVersion = document.querySelector('.brand small');
  setUiVersion('V0.11');
  if(document.getElementById(BUTTON_ID)) return;
  const topbar = document.querySelector('.topbar');
  if(!topbar) return;
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = 'profile-manager-trigger';
  button.textContent = 'Profiles';
  button.title = 'Customer Profiles, Packaging Rules, Mark Templates & Master Templates';
  button.onclick = renderDrawer;
  const exportButton = topbar.querySelector('#quickExport');
  if(exportButton) topbar.insertBefore(button, exportButton); else topbar.appendChild(button);
}

const observer = new MutationObserver(installButton);
observer.observe(document.documentElement, { childList:true, subtree:true });
installButton();
