import {HANDLING_SYMBOLS_V72,handlingSymbolV72,handlingParamsV72,handlingSvgV72} from './handlingSymbolsV72.js';
import {HANDLING_SOURCES_V73} from './handlingSourcesV73.js';
import {iconV67} from './uiIconsV67.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories=['全部','方向','保护','堆码','搬运','回收'];
const labels={stackLimit:'层数上限 · 含底箱',stackHeight:'堆码高度 · m',stackWeight:'上部重量 · kg',temperatureMin:'最低温度 · °C',temperatureMax:'最高温度 · °C'};
const source=id=>HANDLING_SOURCES_V73.find(t=>t.id===id);
function close(d){d.close();d.remove();}
function dialog(title,content){const d=document.createElement('dialog');d.className='v67-dialog v73-symbol-dialog';d.setAttribute('aria-label',title);d.innerHTML=`<header><h2>${esc(title)}</h2><button data-close aria-label="关闭窗口">${iconV67('close')}</button></header>${content}`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>close(d);d.addEventListener('cancel',e=>{e.preventDefault();close(d);});d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;}
function fileSvg(el){return`<svg xmlns="http://www.w3.org/2000/svg" width="${el.w}mm" height="${el.h}mm" viewBox="0 0 ${el.w} ${el.h}"><title>${esc(handlingSymbolV72(el.icon).label)}</title>${handlingSvgV72(el)}</svg>`;}
function download(el){const url=URL.createObjectURL(new Blob([fileSvg(el)],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`boxstudio-${el.icon}.svg`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function showSymbolSourcesV73(){
 const rows=HANDLING_SOURCES_V73.filter(s=>s.source),d=dialog('素材来源与许可',`<p class="v73-source-intro">14 份免费原始 SVG 已随网站打包。可免费修改、用于包装和商用。数字使用 DejaVu Sans Bold 矢量轮廓。</p><div class="v73-source-list">${rows.map(s=>`<article><svg viewBox="0 0 40 40" aria-hidden="true">${handlingSvgV72({icon:s.id,w:40,h:40})}</svg><div><b>${esc(handlingSymbolV72(s.id).label)}</b><small>${esc(s.author)} · ${esc(s.license)}</small><a href="${esc(s.source)}" target="_blank" rel="noopener noreferrer">查看原始素材 ↗</a></div></article>`).join('')}</div><p class="v73-source-intro">层数、高度和禁止堆码为导入图形的组合；原有参数含义保持不变。使用对应的实际储运限制。</p><a href="/assets/handling-v73/LICENSE.md" target="_blank" rel="noopener">许可说明</a>`);return d;
}
function detail(id,onInsert){
 const t=handlingSymbolV72(id),s=source(id),origin=s.source?s:source(s.derivedFrom[0]);let el={icon:id,w:40,h:40};const p=handlingParamsV72(el);
 const d=dialog(t.label,`<div class="v73-symbol-detail"><div class="v73-large-symbol"><svg viewBox="0 0 40 40" data-symbol-preview role="img" aria-label="${esc(t.label)}预览">${handlingSvgV72(el)}</svg><small>矢量图形 · 等比例显示</small></div><form data-symbol-config>${Object.entries(p).map(([key,value])=>`<label>${labels[key]}<input name="${key}" type="number" step="${key==='stackHeight'?.1:1}" value="${value}" required></label>`).join('')}<p class="v73-detail-license">${s.derivedFrom?'导入素材组合':'免费原始矢量'} · ${esc(s.license)}<br><a href="${esc(origin.source)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></p><p data-symbol-error role="alert"></p><button type="submit" class="primary">插入标识</button><button type="button" data-download-symbol>下载 SVG</button></form></div>`);
 const form=d.querySelector('form'),read=()=>{const next={icon:id,w:40,h:40,...Object.fromEntries(new FormData(form))};handlingParamsV72(next);el=next;d.querySelector('[data-symbol-error]').textContent='';return next;};
 form.oninput=()=>{try{d.querySelector('[data-symbol-preview]').innerHTML=handlingSvgV72(read());}catch(e){d.querySelector('[data-symbol-error]').textContent=e.message;}};
 form.onsubmit=e=>{e.preventDefault();try{onInsert(id,handlingParamsV72(read()));close(d);}catch(e){d.querySelector('[data-symbol-error]').textContent=e.message;}};
 d.querySelector('[data-download-symbol]').onclick=()=>{try{download(read());}catch(e){d.querySelector('[data-symbol-error]').textContent=e.message;}};
}
export function symbolLibraryMarkupV73({search='',category='全部'}={}){return`<div class="v73-symbol-intro"><b>箱面运输标识</b><p>点击添加，或拖到画布。参数可继续编辑。</p></div><div class="v72-symbol-head"><input type="search" data-symbol-search aria-label="搜索箱面标识" placeholder="搜索堆码、温度、搬运…" value="${esc(search)}"></div><nav class="v73-symbol-filters" aria-label="标识分类">${categories.map(c=>`<button type="button" data-symbol-category="${c}" aria-pressed="${category===c}">${c}</button>`).join('')}</nav><div class="v73-symbol-count" data-symbol-count aria-live="polite"></div><p data-symbol-error role="alert"></p><div class="v72-symbol-grid" data-symbol-grid></div><button class="v73-symbol-source" data-symbol-sources>${iconV67('file',14)}素材来源 · 免费商用</button>`;}
export function mountSymbolLibraryV73(host,{search='',category='全部',onInsert,onFilter=()=>{}}={}){
 host.innerHTML=symbolLibraryMarkupV73({search,category});let query=search,group=category;
 const grid=host.querySelector('[data-symbol-grid]'),box=host.matches('[data-v73-box-symbols]');
 const render=()=>{const items=HANDLING_SYMBOLS_V72.filter(t=>(group==='全部'||t.category===group)&&(t.label+t.id+t.category).toLowerCase().includes(query.trim().toLowerCase()));
  host.querySelector('[data-symbol-count]').textContent=`${items.length} 个标识 · SVG 矢量`;
  grid.innerHTML=items.map(t=>`<article class="v73-symbol-tile"><button class="v72-symbol-card" data-symbol="${t.id}" ${box?`data-v58-mark="${t.id}"`:""} draggable="true" aria-label="添加${t.label}"><svg viewBox="0 0 40 40" aria-hidden="true">${handlingSvgV72({icon:t.id,w:40,h:40})}</svg><span>${t.label}</span><small>${t.category}</small></button><button class="v73-symbol-details" data-symbol-details="${t.id}" aria-label="预览${t.label}" title="大图预览与参数">${iconV67('search',14)}<span>预览</span></button></article>`).join('')||'<div class="v73-symbol-empty"><b>没有找到标识</b><p>试试“堆码”“怕雨”或“温度”。</p><button data-symbol-clear>清除筛选</button></div>';
  grid.querySelectorAll('[data-symbol]').forEach(b=>{b.onclick=()=>{try{onInsert(b.dataset.symbol);}catch(e){host.querySelector('[data-symbol-error]').textContent=e.message;}};b.ondragstart=e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/boxstudio-mark',b.dataset.symbol);};});
  grid.querySelectorAll('[data-symbol-details]').forEach(b=>b.onclick=()=>detail(b.dataset.symbolDetails,onInsert));
  grid.querySelector('[data-symbol-clear]')?.addEventListener('click',()=>{query='';group='全部';host.querySelector('[data-symbol-search]').value='';filters();render();host.querySelector('[data-symbol-search]').focus();});
  onFilter({search:query,category:group});
 };
 const filters=()=>host.querySelectorAll('[data-symbol-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.symbolCategory===group)));
 host.querySelector('[data-symbol-search]').oninput=e=>{query=e.target.value;render();};host.querySelectorAll('[data-symbol-category]').forEach(b=>b.onclick=()=>{group=b.dataset.symbolCategory;filters();render();});host.querySelector('[data-symbol-sources]').onclick=showSymbolSourcesV73;render();
}
