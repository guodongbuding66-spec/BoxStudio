import { presetsForTemplateV48, dimensionSummaryV48, previewSvgForTemplateV48, templateCountV48, V48_PRODUCT_VERSION } from './productExperienceV48.js';

const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>`${Number(d.L).toFixed(1)} × ${Number(d.W).toFixed(1)} × ${Number(d.H).toFixed(1)} mm`;
let queued=false;

function enhanceTemplateCards(){
  document.querySelectorAll('.v47-template-card').forEach(card=>{
    if(card.dataset.v48Preview==='true')return;const button=card.querySelector('[data-v47-template]');if(!button)return;const id=button.dataset.v47Template,visual=card.querySelector('.v47-template-visual');if(!visual)return;
    const code=visual.querySelector('small')?.textContent||'';visual.innerHTML=`${previewSvgForTemplateV48(id)}<small>${esc(code)}</small>`;card.dataset.v48Preview='true';
  });
  const hero=document.querySelector('.v47-hero-card');if(hero&&!hero.querySelector('[data-v48-count]'))hero.insertAdjacentHTML('beforeend',`<div class="v48-engine-count" data-v48-count><b>${templateCountV48()}</b><span>个真实可计算结构引擎</span></div>`);
}

function readConfig(panel){return {length:panel.querySelector('[data-v47-l]')?.value,width:panel.querySelector('[data-v47-w]')?.value,height:panel.querySelector('[data-v47-h]')?.value,sizeType:panel.querySelector('[data-v47-size-type]')?.value,materialId:panel.querySelector('[data-v47-material]')?.value,flute:panel.querySelector('[data-v47-flute]')?.value,thickness:panel.querySelector('[data-v47-thickness]')?.value};}
function renderSummary(panel){
  const id=panel.dataset.v47Config,target=panel.querySelector('[data-v48-summary]');if(!id||!target)return;
  try{const s=dimensionSummaryV48(id,readConfig(panel));target.innerHTML=`<div><span>内尺寸</span><b>${fmt(s.inside)}</b></div><div><span>制造尺寸</span><b>${fmt(s.manufacturing)}</b></div><div><span>外尺寸</span><b>${fmt(s.external)}</b></div><p>材料：${esc(s.material.name)} · 厚度 ${Number(s.thickness).toFixed(2)} mm${s.material.flute?` · ${esc(s.material.flute)} 楞`:''}</p>`}catch(error){target.innerHTML=`<p class="bad">尺寸换算失败：${esc(error?.message||error)}</p>`}
}
function enhanceConfig(panel){
  if(panel.dataset.v48Enhanced==='true')return;const id=panel.dataset.v47Config;if(!id)return;panel.dataset.v48Enhanced='true';const foot=panel.querySelector('.v47-config-foot');if(!foot)return;
  const presets=presetsForTemplateV48(id);foot.insertAdjacentHTML('beforebegin',`<section class="v48-config-extra"><div class="v48-preset-head"><b>常用尺寸</b><span>一键填入后仍可继续修改</span></div><div class="v48-presets">${presets.map(p=>`<button type="button" data-v48-preset="${esc(p.id)}" data-l="${p.length}" data-w="${p.width}" data-h="${p.height}">${esc(p.label)}<small>${p.length}×${p.width}×${p.height}</small></button>`).join('')}</div><div class="v48-dimension-summary" data-v48-summary></div></section>`);
  panel.querySelectorAll('[data-v48-preset]').forEach(b=>b.onclick=()=>{panel.querySelector('[data-v47-l]').value=b.dataset.l;panel.querySelector('[data-v47-w]').value=b.dataset.w;panel.querySelector('[data-v47-h]').value=b.dataset.h;panel.querySelectorAll('[data-v47-l],[data-v47-w],[data-v47-h]').forEach(input=>input.dispatchEvent(new Event('change',{bubbles:true})));renderSummary(panel)});
  panel.querySelectorAll('[data-v47-l],[data-v47-w],[data-v47-h],[data-v47-size-type],[data-v47-material],[data-v47-flute],[data-v47-thickness]').forEach(el=>{el.addEventListener('input',()=>queueMicrotask(()=>renderSummary(panel)));el.addEventListener('change',()=>queueMicrotask(()=>renderSummary(panel)))});
  renderSummary(panel);
}

function enhance(){document.body.dataset.v48Product='true';enhanceTemplateCards();document.querySelectorAll('[data-v47-config]').forEach(enhanceConfig)}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance()})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});enhance();
window.BoxStudioV48={version:V48_PRODUCT_VERSION,verifiedTemplates:templateCountV48(),dimensionSummary:dimensionSummaryV48,presetsForTemplate:presetsForTemplateV48};
