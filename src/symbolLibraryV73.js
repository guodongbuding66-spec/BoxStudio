import {HANDLING_SYMBOLS_V72,handlingSymbolV72,handlingParamsV72,handlingSvgV72,HANDLING_CATEGORIES_V82,searchHandlingSymbolsV82} from './handlingSymbolsV72.js';
import {HANDLING_SOURCES_V82 as HANDLING_SOURCES_V73} from './handlingSourcesV82.js';
import {iconV67} from './uiIconsV67.js';
import {canBatchSymbolV83,MAX_BATCH_SYMBOLS_V83,SYMBOL_SETS_V83,symbolBatchLayoutV83} from './symbolBatchV83.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories=HANDLING_CATEGORIES_V82;
const labels={stackLimit:'层数上限 · 含底箱',stackHeight:'堆码高度 · m',stackWeight:'上部重量 · kg',temperatureMin:'最低温度 · °C',temperatureMax:'最高温度 · °C'};
const source=id=>HANDLING_SOURCES_V73.find(t=>t.id===id);
function close(d){d.close();d.remove();}
function dialog(title,content){const trigger=document.activeElement;const d=document.createElement('dialog');d.className='v67-dialog v73-symbol-dialog';d.setAttribute('aria-label',title);d.innerHTML=`<header><h2>${esc(title)}</h2><button data-close aria-label="关闭窗口">${iconV67('close')}</button></header>${content}`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>close(d);d.addEventListener('cancel',e=>{e.preventDefault();close(d);});d.addEventListener('close',()=>{d.remove();if(trigger?.isConnected)trigger.focus();},{once:true});d.showModal();return d;}
function fileSvg(el){return`<svg xmlns="http://www.w3.org/2000/svg" width="${el.w}mm" height="${el.h}mm" viewBox="0 0 ${el.w} ${el.h}"><title>${esc(handlingSymbolV72(el.icon).label)}</title>${handlingSvgV72(el)}</svg>`;}
function download(el){const url=URL.createObjectURL(new Blob([fileSvg(el)],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`boxstudio-${el.icon}.svg`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function showSymbolSourcesV73(){
 const rows=HANDLING_SOURCES_V73.filter(s=>s.source),d=dialog('素材来源与许可',`<p class="v73-source-intro">${HANDLING_SYMBOLS_V72.length} 个矢量标识已随网站打包，包含开源原图、原创图形与参数组合。可修改并用于包装和商用；每项保留来源与许可。</p><div class="v73-source-list">${rows.map(s=>`<article><svg viewBox="0 0 40 40" aria-hidden="true">${handlingSvgV72({icon:s.id,w:40,h:40})}</svg><div><b>${esc(handlingSymbolV72(s.id).label)}</b><small>${esc(s.author)} · ${esc(s.license)}</small><a href="${esc(s.source)}" target="_blank" rel="noopener noreferrer">查看原始素材 ↗</a></div></article>`).join('')}</div><p class="v73-source-intro">层数、高度和禁止堆码为导入图形的组合；原有参数含义保持不变。使用对应的实际储运限制。</p><a href="/assets/handling-v73/LICENSE.md" target="_blank" rel="noopener">原始图形许可</a> · <a href="/assets/handling-v82/LICENSE.md" target="_blank" rel="noopener">新增图形许可</a>`);return d;
}
function detail(id,onInsert){
 const t=handlingSymbolV72(id),s=source(id),origin=s.source?s:source(s.derivedFrom[0]);let el={icon:id,w:40,h:40};const p=handlingParamsV72(el);
 const d=dialog(t.label,`<div class="v73-symbol-detail"><div class="v73-large-symbol"><svg viewBox="0 0 40 40" data-symbol-preview role="img" aria-label="${esc(t.label)}预览">${handlingSvgV72(el)}</svg><small>矢量图形 · 等比例显示</small></div><form data-symbol-config>${Object.entries(p).map(([key,value])=>`<label>${labels[key]}<input name="${key}" type="number" step="${key==='stackHeight'?.1:1}" value="${value}" required></label>`).join('')}<p class="v73-detail-license">${s.addedIn?'BoxStudio 原创矢量':s.derivedFrom?'导入素材组合':'免费原始矢量'} · ${esc(s.license)}<br><a href="${esc(origin.source)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></p><p data-symbol-error role="alert"></p><button type="submit" class="primary">插入标识</button><button type="button" data-download-symbol>下载 SVG</button></form></div>`);
 const form=d.querySelector('form'),read=()=>{const next={icon:id,w:40,h:40,...Object.fromEntries(new FormData(form))};handlingParamsV72(next);el=next;d.querySelector('[data-symbol-error]').textContent='';return next;};
 form.oninput=()=>{try{d.querySelector('[data-symbol-preview]').innerHTML=handlingSvgV72(read());}catch(e){d.querySelector('[data-symbol-error]').textContent=e.message;}};
 form.onsubmit=e=>{e.preventDefault();try{onInsert(id,handlingParamsV72(read()));close(d);}catch(e){d.querySelector('[data-symbol-error]').textContent=e.message;}};
 d.querySelector('[data-download-symbol]').onclick=()=>{try{download(read());}catch(e){d.querySelector('[data-symbol-error]').textContent=e.message;}};
}
export function symbolLibraryMarkupV73({search='',category='全部'}={}){return`<div class="v73-symbol-intro"><b>箱面运输标识</b><p>点击添加，或拖到画布。支持双人抬箱等搬运标识。</p></div><div class="v72-symbol-head"><input type="search" data-symbol-search aria-label="搜索箱面标识" placeholder="搜索两人抬箱、叉车、禁刀 / team lift…" value="${esc(search)}"></div><nav class="v73-symbol-filters" aria-label="标识分类">${categories.map(c=>`<button type="button" data-symbol-category="${c}" aria-pressed="${category===c}">${c}</button>`).join('')}</nav><div class="v73-symbol-count" data-symbol-count aria-live="polite"></div><p data-symbol-error role="alert"></p><div class="v72-symbol-grid" data-symbol-grid></div><button class="v73-symbol-source" data-symbol-sources>${iconV67('file',14)}素材来源 · 免费商用</button>`;}
function batchDialog(trigger,{plan,insert},scope){
 const d=dialog('标识组合排版',`<form data-v83-batch-form>
   <p class="v83-batch-hint">选好标识和实际尺寸，一次放入当前画布。每个标识仍可单独编辑。</p>
   <div class="v83-batch-presets" aria-label="常用组合">${SYMBOL_SETS_V83.map(s=>`<button type="button" data-v83-set="${s.id}">${s.label}</button>`).join('')}<button type="button" data-v83-clear>清空选择</button></div>
   <div class="v83-batch-body"><section class="v83-batch-picker"><label>搜索可选标识<input type="search" data-v83-search placeholder="双人抬箱、叉车、team lift"></label>
     <div class="v83-batch-options" data-v83-options></div><p class="v83-batch-hint">按勾选顺序排放，最多 8 个。带数值的标识请单独添加。</p></section>
   <section class="v83-batch-layout" aria-label="组合尺寸与预览">
     <div class="v83-batch-fields"><label>边长 (mm)<input type="number" name="size" min="10" max="100" step="0.1" value="30" required></label>
     <label>间距 (mm)<input type="number" name="gap" min="0" max="30" step="0.1" value="4" required></label>
     <label>每行数量<input type="number" name="columns" min="1" max="8" step="1" value="3" required></label></div>
     <div class="v83-batch-preview" data-v83-preview></div><p class="v83-batch-hint" role="status" data-v83-status></p>
   </section></div>
   <p role="alert" data-v83-error></p>
   <div class="v83-batch-footer"><button type="submit" class="primary" data-v83-apply disabled>插入组合</button></div>
 </form>`);
 d.classList.add('v83-batch-dialog');
 const form=d.querySelector('form'),options=d.querySelector('[data-v83-options]'),preview=d.querySelector('[data-v83-preview]'),
 status=d.querySelector('[data-v83-status]'),error=d.querySelector('[data-v83-error]'),apply=d.querySelector('[data-v83-apply]'),
 search=d.querySelector('[data-v83-search]');
 let selected=new Set();
 const read=()=>({icons:[...selected],...Object.fromEntries(['size','gap','columns'].map(key=>[key,form.elements.namedItem(key).valueAsNumber]))});
 const mm=n=>Number(n.toFixed(1));
 function drawOptions(){
  const items=searchHandlingSymbolsV82({search:search.value}).filter(s=>canBatchSymbolV83(s.id));
  options.innerHTML=items.map(s=>`<label><input type="checkbox" data-v83-pick="${s.id}" ${selected.has(s.id)?'checked':''}><svg viewBox="0 0 40 40" aria-hidden="true">${handlingSvgV72({icon:s.id,w:40,h:40})}</svg><span>${esc(s.label)}</span></label>`).join('')||'<p class="v83-batch-hint">没有找到可选标识，请换一个关键词。</p>';
 }
 function refresh(){
  apply.disabled=true;error.textContent='';status.textContent=`已选 ${selected.size} / ${MAX_BATCH_SYMBOLS_V83}`;
  preview.textContent=selected.size?'填写尺寸后查看预览。':'请选择一个常用组合，或勾选标识。';
  for(const box of options.querySelectorAll('[data-v83-pick]'))box.disabled=!box.checked&&selected.size>=MAX_BATCH_SYMBOLS_V83;
  if(!selected.size)return;
  try{
   const config=read(),layout=symbolBatchLayoutV83(config);
   preview.innerHTML=`<svg viewBox="0 0 ${layout.w} ${layout.h}" role="img" aria-label="组合预览：${esc(layout.cells.map(c=>handlingSymbolV72(c.icon).label).join('、'))}">${layout.cells.map(c=>`<g transform="translate(${c.x} ${c.y})">${handlingSvgV72(c)}</g>`).join('')}</svg>`;
   status.textContent+=` · ${mm(layout.w)} × ${mm(layout.h)} mm`;
   const target=plan(config);status.textContent+=` · ${target.panelLabel}`;apply.disabled=false;
  }catch(e){error.textContent=e.message;}
 }
 for(const button of d.querySelectorAll('[data-v83-set]'))button.onclick=()=>{selected=new Set(SYMBOL_SETS_V83.find(s=>s.id===button.dataset.v83Set).icons);search.value='';drawOptions();refresh();};
 d.querySelector('[data-v83-clear]').onclick=()=>{selected.clear();drawOptions();refresh();};
 options.onchange=e=>{const id=e.target.dataset.v83Pick;if(!id)return;if(e.target.checked)selected.add(id);else selected.delete(id);refresh();};
 search.oninput=()=>{drawOptions();refresh();};
 for(const key of ['size','gap','columns'])form.elements.namedItem(key).oninput=refresh;
 form.onsubmit=e=>{e.preventDefault();if(apply.disabled)return;try{insert(read());close(d);}catch(err){error.textContent=err.message;}};
 d.addEventListener('close',()=>{if(!trigger.isConnected)document.querySelector(scope+' [data-v83-batch-open]')?.focus();},{once:true});
 drawOptions();refresh();
}

export function mountSymbolLibraryV73(host,{search='',category='全部',onInsert,onFilter=()=>{},batch=null}={}){
 host.innerHTML=symbolLibraryMarkupV73({search,category});let query=search,group=category;
 const grid=host.querySelector('[data-symbol-grid]'),box=host.matches('[data-v73-box-symbols]');
 if(batch){
  host.querySelector('.v73-symbol-intro').insertAdjacentHTML('beforeend','<button type="button" class="v83-batch-open" data-v83-batch-open>标识组合排版</button>');
  const trigger=host.querySelector('[data-v83-batch-open]');
  trigger.onclick=()=>batchDialog(trigger,batch,box?'[data-v73-box-symbols]':'[data-v73-symbol-library]');
 }
 const render=()=>{const items=searchHandlingSymbolsV82({search:query,category:group});
  host.querySelector('[data-symbol-count]').textContent=`${items.length} 个标识 · SVG 矢量`;
  grid.innerHTML=items.map(t=>`<article class="v73-symbol-tile"><button class="v72-symbol-card" data-symbol="${t.id}" ${box?`data-v58-mark="${t.id}"`:""} draggable="true" aria-label="添加${t.label}"><svg viewBox="0 0 40 40" aria-hidden="true">${handlingSvgV72({icon:t.id,w:40,h:40})}</svg>${t.addedIn?'<em class="v82-symbol-new">新增</em>':''}<span>${t.label}</span><small>${t.category}</small></button><button class="v73-symbol-details" data-symbol-details="${t.id}" aria-label="预览${t.label}" title="大图预览与参数">${iconV67('search',14)}<span>预览</span></button></article>`).join('')||'<div class="v73-symbol-empty"><b>没有找到标识</b><p>试试“两人抬箱”“叉车”或“温度”。</p><button data-symbol-clear>清除筛选</button></div>';
  grid.querySelectorAll('[data-symbol]').forEach(b=>{b.onclick=()=>{try{onInsert(b.dataset.symbol);}catch(e){host.querySelector('[data-symbol-error]').textContent=e.message;}};b.ondragstart=e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/boxstudio-mark',b.dataset.symbol);};});
  grid.querySelectorAll('[data-symbol-details]').forEach(b=>b.onclick=()=>detail(b.dataset.symbolDetails,onInsert));
  grid.querySelector('[data-symbol-clear]')?.addEventListener('click',()=>{query='';group='全部';host.querySelector('[data-symbol-search]').value='';filters();render();host.querySelector('[data-symbol-search]').focus();});
  onFilter({search:query,category:group});
 };
 const filters=()=>host.querySelectorAll('[data-symbol-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.symbolCategory===group)));
 host.querySelector('[data-symbol-search]').oninput=e=>{query=e.target.value;render();};host.querySelectorAll('[data-symbol-category]').forEach(b=>b.onclick=()=>{group=b.dataset.symbolCategory;filters();render();});host.querySelector('[data-symbol-sources]').onclick=showSymbolSourcesV73;render();
}
