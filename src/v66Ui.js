import { MARK_FIELDS_V66,applyMarkDataV66,validateProjectStateV66 } from './shippingMarkLayoutV66.js';
import { createLocalProjectLibrary,createProjectEnvelope,reviseProjectEnvelope,serializeProjectEnvelope,parseProjectEnvelope,applyProjectEnvelope } from './projectStore.js';
import { downloadText } from './export.js';

const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const editor=()=>window.BoxStudioEditor;
const library=()=>createLocalProjectLibrary(localStorage);
const state=()=>editor().getState();
const uniqueId=()=>`project-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Array.from(globalThis.crypto?.getRandomValues?.(new Uint32Array(3))||[Math.random()*2**32,Math.random()*2**32,Math.random()*2**32],n=>Math.floor(n).toString(36)).join('-')}`}`;
let fitSignature='',saveStatus='',statusTimer=0;

function feedback(message){saveStatus=message;const node=document.querySelector('[data-v66-feedback]');if(node)node.textContent=message;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{saveStatus='';const n=document.querySelector('[data-v66-feedback]');if(n)n.textContent='';},4500);}
function saveProject(copy=false){
  const s=state(),lib=library(),existing=!copy&&s.projectId?lib.load(s.projectId):null;
  const id=copy||!s.projectId?uniqueId():s.projectId;
  const envelope=existing?reviseProjectEnvelope(existing,s,{label:s.projectName}):createProjectEnvelope(s,{id,label:s.projectName});
  lib.save(envelope);s.projectId=envelope.id;editor().commitState(s);feedback('项目已保存');return envelope;
}
function preserveCurrent(){const s=state(),id=uniqueId();library().save(createProjectEnvelope(s,{id,label:`${s.projectName} · 切换前备份`}));}
function closeDialog(){document.querySelector('[data-v66-project-dialog]')?.remove();document.querySelector('[data-v66-projects]')?.focus();}
function openProjects(){
  document.querySelector('[data-v66-project-dialog]')?.remove();
  const s=state(),items=library().list(),dialog=document.createElement('dialog');dialog.dataset.v66ProjectDialog='true';dialog.className='v66-project-dialog';
  dialog.innerHTML=`<header><h2>我的项目</h2><button data-close aria-label="关闭项目窗口">×</button></header><form data-name-form><label>项目名称<input data-project-name maxlength="160" value="${esc(s.projectName)}" required></label><button type="submit">重命名</button></form><div class="v66-project-actions"><button data-save>保存项目</button><button data-copy>另存为副本</button><button data-json>下载项目 JSON</button><button data-import>打开项目 JSON</button><input type="file" data-file accept=".json,application/json" hidden></div><p role="status" data-project-status>项目自动保存在当前浏览器；JSON 可用于备份与换电脑继续编辑。</p><section aria-label="已保存项目">${items.length?items.map(x=>`<article><div><b>${esc(x.label)}</b><small>版本 ${x.revision} · ${esc(new Date(x.updatedAt).toLocaleString('zh-CN'))}</small></div><button data-open="${esc(x.id)}">打开</button></article>`).join(''):'<p class="v66-empty">还没有保存的项目。先保存当前设计，即可在这里重新打开。</p>'}</section>`;
  document.body.appendChild(dialog);dialog.showModal();
  dialog.querySelector('[data-close]').onclick=closeDialog;
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog()});
  dialog.querySelector('[data-name-form]').onsubmit=e=>{e.preventDefault();const value=dialog.querySelector('[data-project-name]').value.trim();if(!value)return;const next=state();next.projectName=value;editor().commitState(next);dialog.querySelector('[data-project-status]').textContent='项目名称已更新；点击保存项目保留快照。';};
  for(const [attr,copy] of [['data-save',false],['data-copy',true]])dialog.querySelector(`[${attr}]`).onclick=()=>{try{saveProject(copy);openProjects();}catch(e){dialog.querySelector('[data-project-status]').textContent=`保存失败：${e.message}`;}};
  dialog.querySelector('[data-json]').onclick=()=>{const current=state(),envelope=createProjectEnvelope(current,{id:current.projectId||uniqueId()});downloadText('boxstudio-project.boxstudio.json',serializeProjectEnvelope(envelope),'application/json');dialog.querySelector('[data-project-status]').textContent='已下载项目 JSON。';};
  dialog.querySelector('[data-import]').onclick=()=>dialog.querySelector('[data-file]').click();
  dialog.querySelector('[data-file]').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>50*1024*1024)throw new Error('项目文件超过 50 MB。');const envelope=parseProjectEnvelope(await file.text()),next=applyProjectEnvelope(state(),envelope);validateProjectStateV66(next);preserveCurrent();next.page='editor';next.editorTab='Design';editor().commitState(next);closeDialog();feedback('项目已打开');}catch(error){dialog.querySelector('[data-project-status]').textContent=`打开失败：${error.message}`;}finally{e.target.value='';}};
  dialog.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{try{const envelope=library().load(b.dataset.open);if(!envelope)throw new Error('项目不存在。');const next=applyProjectEnvelope(state(),envelope);validateProjectStateV66(next);preserveCurrent();next.page='editor';next.editorTab='Design';editor().commitState(next);closeDialog();feedback('项目已打开');}catch(error){dialog.querySelector('[data-project-status]').textContent=`打开失败：${error.message}`;}});
}
function header(){
  const top=document.querySelector('.topbar');if(!top)return;
  if(!top.querySelector('[data-v66-navigation]')){
    const nav=document.createElement('div');nav.dataset.v66Navigation='true';nav.className='v66-navigation';
    nav.innerHTML='<button data-v66-library>盒型库</button><button data-v66-projects>项目</button><button data-v66-resume>继续编辑</button><span data-v66-project-title></span><span role="status" data-v66-feedback></span>';
    top.querySelector('.brand')?.insertAdjacentElement('afterend',nav);
    nav.querySelector('[data-v66-library]').onclick=()=>{try{saveProject();editor().navigate('templates');}catch(error){feedback(`保存失败：${error.message}`);}};
    nav.querySelector('[data-v66-projects]').onclick=openProjects;
    nav.querySelector('[data-v66-resume]').onclick=()=>editor().navigate('editor','Design');
  }
  const name=top.querySelector('[data-v66-project-title]'),s=state().page==='mark-studio'?window.BoxStudioV67?.getMarkState()||state():state();if(name.textContent!==s.projectName)name.textContent=s.projectName;
  top.querySelector('[data-v66-resume]').hidden=s.page==='editor';
  const feedbackNode=top.querySelector('[data-v66-feedback]');if(feedbackNode.textContent!==saveStatus)feedbackNode.textContent=saveStatus;
  let version=top.querySelector('[data-v66-version]');if(!version){version=document.createElement('span');version.dataset.v66Version='true';version.className='v66-version';version.textContent='V0.66';top.querySelector('.brand')?.append(version);}
}
function fieldsHtml(s){
  return MARK_FIELDS_V66.map(([key,label])=>{
    const disabled=s.syncDimensions&&['length','width','height'].includes(key),units=key==='weightUnit'?['KG','LBS']:key==='dimensionUnit'?['MM','CM','INCH']:null;
    const number=['nw','gw','packageIndex','packageCount','length','width','height'].includes(key);
    return `<label>${esc(label)}${units?`<select name="${key}">${[...new Set([...units,s.variables[key]])].filter(Boolean).map(v=>`<option ${v===s.variables[key]?'selected':''}>${esc(v)}</option>`).join('')}</select>`:`<input name="${key}" value="${esc(s.variables[key])}" ${number?'inputmode="decimal"':''} ${disabled?'disabled':''}>`}</label>`;
  }).join('');
}
function marks(){
  const s=state(),right=document.querySelector('.rightpanel'),palette=document.querySelector('[data-v58-marks-studio]');
  if(s.page!=='editor'||s.editorTab!=='Marks'||!right||!palette)return;
  if(!right.querySelector('[data-v66-mark-data]')){
    const card=document.createElement('details');card.dataset.v66MarkData='true';card.className='v66-mark-data';card.open=localStorage.getItem('boxstudio-mark-data-open')!=='0';
    card.innerHTML=`<summary>唛头数据 <span>修改后同步全部绑定位置</span></summary><form><div class="v66-mark-fields">${fieldsHtml(s)}</div><label class="v66-sync"><input type="checkbox" data-sync ${s.syncDimensions?'checked':''}> 包装尺寸跟随纸盒结构</label><p role="alert" data-errors></p><button type="submit" class="primary">应用唛头数据</button></form>`;
    right.prepend(card);card.ontoggle=()=>localStorage.setItem('boxstudio-mark-data-open',card.open?'1':'0');
    const form=card.querySelector('form'),sync=card.querySelector('[data-sync]');sync.onchange=()=>{for(const key of ['length','width','height'])form.elements[key].disabled=sync.checked;};
    form.onsubmit=e=>{e.preventDefault();try{const patch=Object.fromEntries(new FormData(form));const next=applyMarkDataV66(state(),patch,{syncDimensions:sync.checked});editor().commitState(next);feedback('唛头数据已同步');}catch(error){card.querySelector('[data-errors]').textContent=error.message;}};
  }
  if(!palette.querySelector('[data-v66-edit-data]')){
    const button=document.createElement('button');button.dataset.v66EditData='true';button.textContent='编辑唛头数据';button.onclick=()=>{const card=document.querySelector('[data-v66-mark-data]');card.open=true;card.scrollIntoView({block:'start',behavior:'smooth'});card.querySelector('[name="sku"]')?.focus();};palette.querySelector('.v58-marks-head')?.append(button);
  }
  if(!palette.querySelector('[data-v66-presets-toggle]')){
    const button=document.createElement('button');button.dataset.v66PresetsToggle='true';
    const update=()=>{const open=localStorage.getItem('boxstudio-mobile-presets-open')==='1';palette.dataset.v66PresetsOpen=String(open);button.setAttribute('aria-expanded',String(open));button.textContent=open?'收起组件':'展开组件';};
    button.onclick=()=>{localStorage.setItem('boxstudio-mobile-presets-open',palette.dataset.v66PresetsOpen==='true'?'0':'1');update();requestAnimationFrame(()=>editor().fitCanvas());};
    palette.querySelector('.v58-marks-head')?.append(button);update();
  }
}
function fit(){
  const s=state(),svg=document.querySelector('#designSvg');if(!svg)return;
  const signature=JSON.stringify([s.structure,s.editorTab]);if(signature===fitSignature)return;fitSignature=signature;
  requestAnimationFrame(()=>{if(document.querySelector('#designSvg')===svg)editor().fitCanvas();});
}
function enhance(){if(!editor())return;document.body.dataset.v66='true';header();marks();fit();}
window.BoxStudioUiRuntimeV64?.register('v66',enhance);
window.addEventListener('keydown',e=>{if(state().page==='mark-studio'||e.defaultPrevented||document.querySelector('dialog[open],.v33-workspace,.v34-workspace'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();try{saveProject();}catch(error){feedback(`保存失败：${error.message}`);}}});
window.BoxStudioV66={version:'V0.66',saveProject,openProjects};
