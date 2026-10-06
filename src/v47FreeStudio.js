import { STORAGE_KEY, defaultState } from './model.js';
import { V47_FREE_POLICY, V47_WORKFLOW, V47_TEMPLATE_FILTERS, V47_MARK_QUICK_ACTIONS, searchFreeTemplatesV47, dimensionSummaryV47, templateCategoryV47 } from './freeStudioV47.js';

const clone=v=>structuredClone(v);
let observer=null,queued=false,templateQuery='',templateCategory='all';
function readState(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return parsed?{...clone(defaultState),...parsed,structure:{...defaultState.structure,...(parsed.structure||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function activePage(){return document.querySelector('.nav [data-nav].active')?.dataset.nav||null}
function activeTab(){return document.querySelector('.tabbar [data-tab].active')?.dataset.tab||null}
function clickNav(id){document.querySelector(`[data-nav="${CSS.escape(id)}"]`)?.click()}
function clickTab(id){document.querySelector(`[data-tab="${CSS.escape(id)}"]`)?.click()}
function clickTool(id){document.querySelector(`[data-tool="${CSS.escape(id)}"]`)?.click()}
function el(tag,cls,html=''){const n=document.createElement(tag);if(cls)n.className=cls;n.innerHTML=html;return n}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function decorateShell(){
  document.body.dataset.v47FreeStudio='true';document.title='BoxStudio Free · 在线纸盒设计与唛头编辑';
  const brand=document.querySelector('.topbar .brand');if(brand&&!brand.dataset.v47){brand.dataset.v47='true';brand.innerHTML='BOXSTUDIO <small>FREE</small>';const pill=el('span','v47-free-pill','永久免费');brand.after(pill)}
  const save=document.querySelector('.topbar .save-state');if(save&&!document.querySelector('.v47-shell-note')){const note=el('span','v47-shell-note','无需登录 · 无水印 · 所有生产导出免费');save.before(note)}
  const exportBtn=document.querySelector('#quickExport');if(exportBtn){exportBtn.textContent='免费导出';exportBtn.title='SVG / PDF / DXF / PNG / Production PDF — 无付费墙'}
  const labels={dashboard:'工作台',templates:'盒型库',projects:'项目',editor:'设计器',marks:'唛头库'};for(const [id,label] of Object.entries(labels)){const b=document.querySelector(`[data-nav="${id}"]`);if(b)b.textContent=label}
}

function dashboardHero(){
  if(activePage()!=='dashboard')return;const page=document.querySelector('main.page');if(!page||page.querySelector('.v47-hero'))return;
  const hero=el('section','v47-hero',`<div class="v47-hero-copy"><div class="eyebrow">FREE PACKAGING STUDIO</div><h1>从盒型到刀版、3D、唛头与生产文件</h1><p>面向包装工程、外贸、工厂与设计团队的免费在线纸盒工作台。选择盒型后输入尺寸和材料，直接编辑刀线与图文，验证 3D 折叠，制作运输唛头与条码，最后导出生产文件。</p><div class="v47-hero-actions"><button class="primary" data-v47-go="templates">选择盒型</button><button data-v47-go-tab="Structure">新建设计</button><button data-v47-go-tab="Marks">编辑唛头</button><button data-v47-go-tab="3D">3D 验证</button></div></div><div class="v47-cap-grid"><div class="v47-cap"><b>参数化盒型</b><span>FEFCO / Mailer / Folding Carton</span></div><div class="v47-cap"><b>专业 2D CAD</b><span>Line / Arc / Cubic / Fillet / Chamfer</span></div><div class="v47-cap"><b>运输唛头</b><span>变量 / Barcode / QR / Excel Batch</span></div><div class="v47-cap"><b>生产导出</b><span>SVG / PDF / DXF / PNG · Free</span></div></div>`);
  page.prepend(hero);hero.querySelectorAll('[data-v47-go]').forEach(b=>b.onclick=()=>clickNav(b.dataset.v47Go));hero.querySelectorAll('[data-v47-go-tab]').forEach(b=>b.onclick=()=>{clickNav('editor');setTimeout(()=>clickTab(b.dataset.v47GoTab),0)});
}

function categoryFromCard(card){
  const engine=card.querySelector('[data-use-template]')?.dataset.useTemplate;if(engine){const record=searchFreeTemplatesV47({}).find(x=>x.id===engine);return record?templateCategoryV47(record):'all'}
  const text=card.textContent.toLowerCase();if(text.includes('import')||text.includes('svg')&&text.includes('dxf'))return'import';if(text.includes('mailer')||text.includes('0427')||text.includes('150010')||text.includes('飞机'))return'mailer';if(text.includes('tuck')||text.includes('carton')||text.includes('ecma')||text.includes('纸盒'))return'folding-carton';return'shipping';
}
function decorateTemplateCards(){
  const cards=[...document.querySelectorAll('main.page .cards > .card')];for(const card of cards){if(card.dataset.v47Card)return;card.dataset.v47Card='true';card.dataset.v47Category=categoryFromCard(card);const meta=el('div','v47-card-meta',`<span class="v47-card-category">${esc(card.dataset.v47Category)}</span><span class="v47-card-free">FREE</span>`);card.prepend(meta)}
}
function applyTemplateFilter(){
  const cards=[...document.querySelectorAll('main.page .cards > .card[data-v47-card]')],q=templateQuery.trim().toLowerCase();let visible=0;for(const card of cards){const category=card.dataset.v47Category,okCategory=templateCategory==='all'||category===templateCategory,okQuery=!q||card.textContent.toLowerCase().includes(q);card.style.display=okCategory&&okQuery?'':'none';if(okCategory&&okQuery)visible++}const counter=document.querySelector('[data-v47-template-count]');if(counter)counter.textContent=`${visible} 个可用盒型 / 入口`}
function templateLibrary(){
  if(activePage()!=='templates')return;const page=document.querySelector('main.page');if(!page)return;decorateTemplateCards();if(!page.querySelector('.v47-template-shell')){const shell=el('section','v47-template-shell',`<div class="v47-template-head"><strong>盒型资源库</strong><div class="v47-template-search"><input data-v47-template-search placeholder="搜索盒型、标准、编号，例如 0427 / mailer / RSC"></div><span class="v47-template-count" data-v47-template-count></span></div><div class="v47-filter-row">${V47_TEMPLATE_FILTERS.map(x=>`<button data-v47-category="${x.id}" class="${x.id===templateCategory?'active':''}">${x.label}</button>`).join('')}</div>`);const head=page.querySelector('.page-head');head?.after(shell);const input=shell.querySelector('[data-v47-template-search]');input.value=templateQuery;input.oninput=e=>{templateQuery=e.target.value;applyTemplateFilter()};shell.querySelectorAll('[data-v47-category]').forEach(b=>b.onclick=()=>{templateCategory=b.dataset.v47Category;shell.querySelectorAll('[data-v47-category]').forEach(x=>x.classList.toggle('active',x===b));applyTemplateFilter()})}applyTemplateFilter();
}

function pageIntro(){
  const pageName=activePage();if(!['projects','marks'].includes(pageName))return;const page=document.querySelector('main.page');if(!page||page.querySelector('.v47-page-intro'))return;const copy=pageName==='marks'?['免费唛头与包装标识','SKU、净重/毛重、箱规、原产国、CRN、箱号、运输图标、真实一维码、QR 与 Excel 批量字段都可以直接编辑。']:['本地项目工作台','默认自动保存到浏览器；不要求账号。项目、刀版、唛头和批量数据都留在同一工作流中。'];const intro=el('div','v47-page-intro',`<div><b>${copy[0]}</b><span>${copy[1]}</span></div><span class="v47-free-pill">${V47_FREE_POLICY.statement}</span>`);page.prepend(intro)}

function workflowBar(){
  if(activePage()!=='editor')return;const main=document.querySelector('.workspace .main'),tabs=main?.querySelector('.tabbar');if(!main||!tabs||main.querySelector('.v47-workflow'))return;const current=activeTab();const bar=el('div','v47-workflow',V47_WORKFLOW.map((x,i)=>`${i?'<span class="v47-step-sep">›</span>':''}<button class="v47-step ${x.tab===current?'active':''}" data-v47-step="${x.id}" ${x.id==='templates'?'data-v47-nav-step="templates"':`data-v47-tab-step="${x.tab}"`} title="${esc(x.description)}"><b>${i+1}</b><span>${x.label}</span></button>`).join(''));tabs.before(bar);bar.querySelectorAll('[data-v47-nav-step]').forEach(b=>b.onclick=()=>clickNav(b.dataset.v47NavStep));bar.querySelectorAll('[data-v47-tab-step]').forEach(b=>b.onclick=()=>clickTab(b.dataset.v47TabStep))}

function dimensionCard(){
  if(activePage()!=='editor')return;const right=document.querySelector('.workspace .rightpanel');if(!right||right.querySelector('.v47-dimension-card'))return;let d;try{d=dimensionSummaryV47(readState().structure)}catch{return}const fmt=x=>`${x.L} × ${x.W} × ${x.H} mm`;const card=el('section','v47-dimension-card',`<div class="v47-panel-title"><b>尺寸系统</b><span>${esc(d.mode)} input</span></div><div class="v47-dimension-grid"><div class="v47-dim"><span>内尺寸</span><b>${fmt(d.inside)}</b></div><div class="v47-dim"><span>制造尺寸</span><b>${fmt(d.manufacturing)}</b></div><div class="v47-dim"><span>外尺寸</span><b>${fmt(d.external)}</b></div></div><div class="v47-material-line"><span>材料</span><strong>${esc(d.material.name)} · ${d.thicknessMm} mm${d.material.flute?` · ${esc(d.material.flute)} flute`:''}</strong></div>`);right.prepend(card)}

function markQuickActions(){
  if(activePage()!=='editor'||activeTab()!=='Marks')return;const right=document.querySelector('.workspace .rightpanel');if(!right||right.querySelector('.v47-mark-actions'))return;const box=el('section','v47-mark-actions',`<div class="v47-panel-title"><b>唛头快速工具</b><span>全部免费</span></div><div class="v47-mark-grid">${V47_MARK_QUICK_ACTIONS.map(x=>`<button class="v47-mark-action" data-v47-tool="${x.tool}"><b>${x.label}</b><span>${x.description}</span></button>`).join('')}</div>`);right.prepend(box);box.querySelectorAll('[data-v47-tool]').forEach(b=>b.onclick=()=>clickTool(b.dataset.v47Tool))}

function exportFreeNotice(){
  if(activePage()!=='editor'||activeTab()!=='Export')return;const right=document.querySelector('.workspace .rightpanel');if(!right||right.querySelector('.v47-free-export'))return;right.prepend(el('section','v47-free-export',`<b>生产导出永久免费</b><span>无需登录、无水印、不设下载次数限制。现有 SVG / PDF / DXF / PNG / Production PDF 能力直接开放。</span>`))}
function previewLaunch(){
  if(activePage()!=='editor'||activeTab()==='3D')return;const right=document.querySelector('.workspace .rightpanel');if(!right||right.querySelector('.v47-preview-launch'))return;const box=el('section','v47-preview-launch',`<div class="v47-panel-title"><b>3D 结构验证</b><span>Hinge Pivot</span></div><button data-v47-open-3d>打开 3D 折叠预览</button>`);right.prepend(box);box.querySelector('[data-v47-open-3d]').onclick=()=>clickTab('3D')}
function lineLegend(){
  if(activePage()!=='editor')return;const status=document.querySelector('.workspace .status');if(!status||status.querySelector('.v47-line-legend'))return;const legend=el('div','v47-line-legend','<span class="cut"><i></i>CUT</span><span class="crease"><i></i>CREASE</span><span class="bleed"><i></i>BLEED</span><span class="safe"><i></i>SAFE</span>');const right=status.querySelector('.right');right?.prepend(legend)}

function freeGateAudit(){
  if(activePage()!=='editor')return;for(const button of document.querySelectorAll('#exportSvg,#exportPdf,#exportDxf,#exportPng,#batchSvg,#batchPdf,#batchCombinedPdf')){button.dataset.v47Free='true';button.title=(button.title?button.title+' · ':'')+'BoxStudio Free — no login/paywall'}
}

function decorate(){decorateShell();dashboardHero();templateLibrary();pageIntro();workflowBar();dimensionCard();markQuickActions();exportFreeNotice();previewLaunch();lineLegend();freeGateAudit()}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});decorate();

window.BoxStudioV47={version:'V0.47',freePolicy:V47_FREE_POLICY,workflow:V47_WORKFLOW,searchTemplates:searchFreeTemplatesV47,dimensionSummary:dimensionSummaryV47,allFeaturesFree:true,noLoginRequired:true,noWatermark:true};
