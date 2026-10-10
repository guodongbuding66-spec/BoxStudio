import {mountSymbolLibraryV73} from './symbolLibraryV73.js';
import {handlingSvgV72} from './handlingSymbolsV72.js';
import {iconV67} from './uiIconsV67.js';
import { STORAGE_KEY, defaultState, cloneState } from './model.js';
import { mountArtworkProof } from './threeArtworkProof.js';
import { buildLinkedWorkspaceModelV49 } from './linkedWorkspaceV49.js';
import { V58_PRODUCT_VERSION, V58_FREE_POLICY, V58_STUDIO_FLOW, V58_MARK_GROUPS, V58_MARK_PRESETS, V58_PRINT_ADVISORIES, addMarkPresetV58, markPanelOptionsV58, studioSummaryV58, productAcceptanceV58 } from './productExperienceV58.js';
import { addMarkPresetV66 } from './shippingMarkLayoutV66.js';
import {dropBoxSymbolV73} from './symbolPlacementV73.js';

const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let queued=false,miniProof=null,miniHost=null;
const v64Runtime=window.BoxStudioUiRuntimeV64;
const legacyNavRetired=()=>v64Runtime?.policy?.suppressLegacyNavigation===true;

function readState(){
  try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),b=cloneState(defaultState);return p?{...b,...p,structure:{...b.structure,...(p.structure||{})},variables:{...b.variables,...(p.variables||{})},batch:{...b.batch,...(p.batch||{})}}:b}catch{return cloneState(defaultState)}
}
function saveState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function go(page,editorTab=null){if(window.BoxStudioEditor?.navigate)return window.BoxStudioEditor.navigate(page,editorTab);const s=readState();s.page=page;if(editorTab)s.editorTab=editorTab;saveState(s);location.reload()}
function currentPage(){return document.querySelector('.nav button.active')?.dataset.nav||readState().page}
function currentTab(){return document.querySelector('.tabbar button.active')?.dataset.tab||readState().editorTab}

function syncAdvancedState(){const on=localStorage.getItem('boxstudio-v58-advanced')==='1';document.body.dataset.v58Advanced=on?'true':'false';return on}
function enhanceTopbar(){
  const top=document.querySelector('.topbar');if(!top)return;document.body.dataset.v58Studio='true';
  if(top.dataset.v58!=='true'){top.dataset.v58='true';const brand=top.querySelector('.brand');if(brand){brand.innerHTML=`BOXSTUDIO <small>${V58_PRODUCT_VERSION}</small>`;brand.title='Free packaging design studio'}}
  if(legacyNavRetired()){
    top.querySelector('.v58-quicknav')?.remove();syncAdvancedState();document.body.dataset.v58LegacyNav='retired';const ex=top.querySelector('#quickExport');if(ex&&ex.textContent!=='导出文件')ex.textContent='导出文件';return;
  }
  if(!top.querySelector('.v58-quicknav')){const quick=document.createElement('div');quick.className='v58-quicknav';quick.innerHTML=`<button data-v58-go="templates">盒型库</button><button data-v58-go="Design">2D设计</button><button data-v58-go="3D">3D预览</button><button data-v58-go="Marks">唛头</button><button data-v58-go="Export">导出</button><button class="advanced" data-v58-advanced>高级生产</button>`;const nav=top.querySelector('.nav');nav?.insertAdjacentElement('afterend',quick);quick.querySelectorAll('[data-v58-go]').forEach(b=>b.onclick=()=>b.dataset.v58Go==='templates'?go('templates'):go('editor',b.dataset.v58Go));const adv=quick.querySelector('[data-v58-advanced]'),sync=()=>{const on=syncAdvancedState();adv.classList.toggle('active',on);const text=on?'收起高级生产':'高级生产';if(adv.textContent!==text)adv.textContent=text};adv.onclick=()=>{localStorage.setItem('boxstudio-v58-advanced',localStorage.getItem('boxstudio-v58-advanced')==='1'?'0':'1');sync()};sync()}
  const ex=top.querySelector('#quickExport');if(ex&&ex.textContent!=='导出文件')ex.textContent='导出文件';
}

const TOOL_LABELS={select:'选择',text:'文字',image:'图片',shape:'形状',line:'线条',barcode:'条码+QR',qr:'QR',mark:'搬运标识',var:'变量',dieline:'刀版'};
function enhanceToolbar(){document.querySelectorAll('.toolbar [data-tool]').forEach(b=>{if(b.dataset.v58Label)return;b.dataset.v58Label=TOOL_LABELS[b.dataset.tool]||b.dataset.tool;b.insertAdjacentHTML('beforeend',`<span>${esc(b.dataset.v58Label)}</span>`)})}

function contextBar(){
  const s=readState(),m=studioSummaryV58(s);return `<div class="v58-contextbar" data-v58-context><div class="v58-context-main"><span>当前结构</span><b>${esc(m.templateId)}</b><small>${m.length} × ${m.width} × ${m.height} mm · ${esc(m.materialId||'material')} · ${m.thickness} mm${m.flute?` · ${esc(m.flute)}`:''}</small></div><div class="v58-context-actions"><button data-v58-context-go="Structure">修改尺寸 / 材料</button><button data-v58-context-go="3D">查看 3D</button><button data-v58-context-go="Marks">编辑唛头</button></div></div>`
}
function enhanceEditorHeader(){
  const main=document.querySelector('.workspace .main'),tabbar=main?.querySelector('.tabbar');if(!main||!tabbar)return;
  if(legacyNavRetired()){main.querySelector('[data-v58-context]')?.remove();return}
  if(!main.querySelector('[data-v58-context]'))tabbar.insertAdjacentHTML('afterend',contextBar());main.querySelectorAll('[data-v58-context-go]').forEach(b=>b.onclick=()=>go('editor',b.dataset.v58ContextGo));
}

function disposeMini(){if(miniProof){try{miniProof.dispose?.()}catch{}miniProof=null}miniHost=null}
function mountMiniPreview(){
  const tab=currentTab(),right=document.querySelector('.rightpanel');if(!right||!['Design','Marks','Structure'].includes(tab)){disposeMini();return}if(right.querySelector('[data-v58-mini3d]'))return;
  disposeMini();const card=document.createElement('section');card.className='v58-mini3d-card';card.dataset.v58Mini3d='true';card.innerHTML=`<div class="v58-mini3d-head"><div><span>LIVE 3D</span><b>实时成型预览</b></div><button data-v58-open3d>展开</button></div><div class="v58-mini3d-host" data-v58-mini3d-host></div><div class="v77-mini-fold"><span>展开</span><input aria-label="侧栏开合进度" data-v77-mini-fold type="range" min="0" max="100" value="100"><span>闭合</span><button data-v77-mini-play aria-label="侧栏开合动画">▶</button></div><div class="v58-mini3d-foot"><span data-v58-mini3d-status>Preparing…</span><small>拖动旋转 · 滚轮缩放</small></div>`;right.prepend(card);card.querySelector('[data-v58-open3d]').onclick=()=>go('editor','3D');miniHost=card.querySelector('[data-v58-mini3d-host]');
  try{const s=readState(),model=buildLinkedWorkspaceModelV49(s);miniProof=mountArtworkProof(miniHost,s,model.review.geo,model.review.graph,{selectedPanelId:s.markEditorPanelId||model.selected?.panelId||null,materialStyle:model.review.material,onStatus:st=>{const e=card.querySelector('[data-v58-mini3d-status]');if(e){const text=`${st.panels} panels · ${st.texturedPanels} artwork`;if(e.textContent!==text)e.textContent=text}}});miniProof?.setProgress?.(100);const range=card.querySelector('[data-v77-mini-fold]');range.oninput=()=>miniProof?.setProgress(Number(range.value));let timer=0;card.querySelector('[data-v77-mini-play]').onclick=()=>{clearTimeout(timer);const start=Number(range.value),end=start>=50?0:100;const started=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:1200;const tick=()=>{if(!card.isConnected)return;const t=duration?Math.min(1,(performance.now()-started)/duration):1;range.value=String(Math.round(start+(end-start)*(t*t*(3-2*t))));miniProof?.setProgress(Number(range.value));if(t<1)timer=setTimeout(tick,50);};tick();}}catch(error){miniHost.innerHTML=`<div class="v58-mini3d-error">3D preview unavailable<br><small>${esc(error?.message||error)}</small></div>`}
}

function markButton(id){const p=V58_MARK_PRESETS[id];return `<button data-v58-mark="${esc(id)}"><span>${p.kind==='icon'?`<svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">${handlingSvgV72({icon:p.icon,w:40,h:40})}</svg>`:iconV67(p.kind==='barcode-qr-group'?'barcode':'text',20)}</span><b>${esc(p.label)}</b></button>`}
function marksPalette(){
  const s=readState(),panels=markPanelOptionsV58(s),selected=s.markEditorPanelId||s.linkedV49?.selectedPanelId||panels[0]?.id||'';
  return `<section class="v58-marks-studio" data-v58-marks-studio><div class="v58-marks-head"><div><span>SHIPPING MARK STUDIO</span><b>唛头组件</b><small>选择面板后，一键插入运输信息、条码 / QR 与搬运标识</small></div><label>目标面<select data-v58-mark-panel>${panels.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.label)} · ${esc(p.role)}</option>`).join('')}</select></label></div><div class="v58-mark-groups">${V58_MARK_GROUPS.map(g=>g.id==='handling'?'<div data-v73-box-symbols></div>':`<div class="v58-mark-group"><strong>${esc(g.label)}</strong><div>${g.items.map(markButton).join('')}</div></div>`).join('')}</div><details class="v58-print-note"><summary>印前检查提示</summary>${V58_PRINT_ADVISORIES.map(x=>`<p>✓ ${esc(x.label)}</p>`).join('')}</details><button class="v58-batch-focus" data-v58-batch-focus>批量唛头 · Excel / CSV 字段映射 →</button></section>`
}
function enhanceMarks(){
  const main=document.querySelector('.workspace .main');if(!main||currentTab()!=='Marks'||document.querySelector('[data-v58-marks-studio]'))return;const canvas=main.querySelector('.canvas-shell');if(!canvas)return;canvas.insertAdjacentHTML('beforebegin',marksPalette());const studio=main.querySelector('[data-v58-marks-studio]'),panel=studio.querySelector('[data-v58-mark-panel]');
  studio.querySelectorAll('[data-v58-mark]').forEach(b=>b.onclick=()=>{try{const result=addMarkPresetV66(readState(),b.dataset.v58Mark,{panelId:panel.value});saveState(result.state);if(window.BoxStudioEditor?.reloadFromStorage)window.BoxStudioEditor.reloadFromStorage();else location.reload()}catch(error){let message=studio.querySelector('[data-mark-error]');if(!message){message=document.createElement('p');message.dataset.markError='true';message.setAttribute('role','alert');studio.appendChild(message)}message.textContent=error?.message||String(error);studio.dataset.error=message.textContent}});
  mountSymbolLibraryV73(studio.querySelector('[data-v73-box-symbols]'),{onInsert:(id,params)=>{const result=addMarkPresetV66(readState(),id,{panelId:panel.value});if(params)Object.assign(result.element,params);saveState(result.state);window.BoxStudioEditor.reloadFromStorage();}});
  const svg=main.querySelector('#designSvg');
  if(svg){svg.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/boxstudio-mark')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});svg.addEventListener('drop',e=>{const id=e.dataTransfer.getData('application/boxstudio-mark');if(!id)return;e.preventDefault();try{const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());window.BoxStudioEditor.commitState(dropBoxSymbolV73(readState(),id,local));}catch(error){studio.querySelector('[data-symbol-error]').textContent=error.message;}});}
  studio.querySelector('[data-v58-batch-focus]').onclick=()=>{const file=document.querySelector('#batchFile')?.closest('.panel-section');file?.scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('#batchFile')?.closest('.file-drop')?.classList.add('v58-pulse')};
}

function enhanceTemplates(){
  const page=document.querySelector('.page');if(currentPage()!=='templates'||!page||page.dataset.v58Templates==='true')return;page.dataset.v58Templates='true';page.classList.add('v58-template-page');const hero=page.querySelector('.v47-hero');if(hero)hero.insertAdjacentHTML('beforebegin',`<div class="v58-library-head"><div><span>STRUCTURE LIBRARY</span><h1>选择结构，输入尺寸，直接开始设计</h1><p>盒型参数化、2D 刀版、3D 成型、唛头与生产导出保持在同一个项目里。</p></div><div class="v58-flow-mini">${V58_STUDIO_FLOW.map((x,i)=>`<span><b>${i+1}</b>${esc(x.label)}</span>`).join('')}</div></div>`);
  const toolbar=page.querySelector('.v47-template-toolbar');if(toolbar&&!toolbar.querySelector('.v58-template-note'))toolbar.insertAdjacentHTML('beforeend','<div class="v58-template-note">只展示真实可计算结构；未实现结构不会伪造刀版。</div>');
}

function collapseAdvancedProduction(){
  const nodes=[...document.querySelectorAll('[data-v55-manufacturing],[data-v56-factory],[data-v57-routing]')];nodes.forEach(n=>{n.classList.add('v58-advanced-production')});syncAdvancedState();
}

function markActiveQuickNav(){const p=currentPage(),t=currentTab();document.querySelectorAll('.v58-quicknav [data-v58-go]').forEach(b=>{const v=b.dataset.v58Go;b.classList.toggle('active',(v==='templates'&&p==='templates')||(p==='editor'&&v===t))})}
function enhance(){
  enhanceTopbar();enhanceToolbar();markActiveQuickNav();enhanceTemplates();if(currentPage()==='editor'){enhanceEditorHeader();enhanceMarks();mountMiniPreview();collapseAdvancedProduction()}else disposeMini();document.body.dataset.v58Acceptance=productAcceptanceV58().ok?'pass':'fail';
}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}
if(v64Runtime?.register)v64Runtime.register('v58',enhance);else{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});enhance()}

window.BoxStudioV58={version:V58_PRODUCT_VERSION,freePolicy:V58_FREE_POLICY,flow:V58_STUDIO_FLOW,markGroups:V58_MARK_GROUPS,markPresets:V58_MARK_PRESETS,getState:readState,getSummary:()=>studioSummaryV58(readState()),getAcceptance:productAcceptanceV58,addMark:(id,panelId)=>{const r=addMarkPresetV58(readState(),id,{panelId});saveState(r.state);return r},go};
