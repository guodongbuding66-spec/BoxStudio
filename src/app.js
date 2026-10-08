import {barcodeGroupLayoutV70,barcodeSizeV70,assertBarcodeProductionV70,BARCODE_SIZE_MESSAGE_V70} from './barcodeGroupV70.js';
import {addMarkPresetV66} from './shippingMarkLayoutV66.js';
import {iconV67} from './uiIconsV67.js';
import { STORAGE_KEY, LEGACY_STORAGE_KEYS, defaultState, cloneState, stateForTemplate } from './model.js';
import { renderTemplate, isPackageNoticeVisible, normalizeVariables } from './variables.js';
import { generateGeometry, resolveElementRect, clampElementToPanel, reanchorElementByAbsolute, fitCssSize, defaultsForTemplate } from './geometry.js';
import { buildFoldGraph, graphStats } from './foldgraph.js';
import { runPreflight } from './preflight.js';
import { exportSvg, exportPng, exportPdf, exportDxf, cleanSvg, buildProductionPdf, buildMultiPagePdf, downloadBytes } from './export.js';
import { barcodeSvg, BARCODE_TYPES } from './barcode.js';
import { qrSvgRects } from './qrcode.js';
import { parseBatchWorkbook, autoMapHeaders, rowToVariables, safeBatchFileName, VARIABLE_FIELDS } from './batch.js';
import { mountThreePreview, disposeThreePreview } from './threePreview.js';
import { parseDielineFile, curveToPath, inferFoldCandidates } from './importDieline.js';
import { analyzeImportedGeometry, repairImportedGeometry, addPanel, addPolygonPanel, updatePolygonPanel, deletePanel, splitPanel, mergePanels } from './repair.js';
import { STANDARD_TEMPLATE_CATALOG } from './templates.js';
import { loadUserTtf, clearUserTtf, userTtfInfo } from './fontRegistry.js';
import { loadOutputIcc, clearOutputIcc, outputIccInfo } from './iccRegistry.js';
import { PRINT_PROFILES, applyPrintProfile, spotNameFor } from './printProfiles.js';

const app = document.getElementById('app');
let state = load();
const entryPathV69=location.pathname.replace(/\/$/,'');
if(entryPathV69==='/marks')state.page='mark-studio';
else if(entryPathV69==='/box'){state.page='editor';state.editorTab='Structure';}
let history = [cloneState(state)];
let historyIndex = 0;
let dragging = null;
let dielineDragging = null;
let curveDragging = null;
let activeTool = 'select';
let threeController = null;

function load(){
  try{
    let raw=localStorage.getItem(STORAGE_KEY), migrated=false;
    if(!raw){for(const key of LEGACY_STORAGE_KEYS){raw=localStorage.getItem(key);if(raw){migrated=true;break}}}
    if(!raw) return cloneState(defaultState);
    const parsed=JSON.parse(raw);
    const merged={...cloneState(defaultState),...parsed,structure:{...defaultState.structure,...(parsed.structure||{})},variables:{...defaultState.variables,...(parsed.variables||{})},batch:{...defaultState.batch,...(parsed.batch||{})},dielineEdit:{...defaultState.dielineEdit,...(parsed.dielineEdit||{})},curveEdit:{...defaultState.curveEdit,...(parsed.curveEdit||{})},panelEdit:{...defaultState.panelEdit,...(parsed.panelEdit||{})},exportOptions:{...defaultState.exportOptions,...(parsed.exportOptions||{})}};
    if(migrated)localStorage.setItem(STORAGE_KEY,JSON.stringify(merged));
    return merged;
  }catch{return cloneState(defaultState)}
}
function persist(){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));updateSaveState()}
function pushHistory(){history=history.slice(0,historyIndex+1);history.push(cloneState(state));historyIndex=history.length-1;persist()}
function undo(){if(historyIndex>0){historyIndex--;state=cloneState(history[historyIndex]);persist();render()}}
function redo(){if(historyIndex<history.length-1){historyIndex++;state=cloneState(history[historyIndex]);persist();render()}}
function setState(fn,{history=true}={}){fn(state);if(history)pushHistory();else persist();render()}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function updateSaveState(){const el=document.querySelector('.save-state');if(el)el.textContent=state.savedAt?`Saved ${new Date(state.savedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'Not saved'}
function geo(){return generateGeometry(state.structure)}
function templateLabel(){return state.structure.template==='imported'?'Imported Dieline':state.structure.template==='mailer-150010'?'Mailer 150010':state.structure.template}
function syncShippingDimensions(){
  if(!state.syncDimensions)return;
  const unit=String(state.variables.dimensionUnit||'INCH').toUpperCase();
  const k=unit==='INCH'?1/25.4:unit==='CM'?1/10:1;
  state.variables.length=(state.structure.length*k).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
  state.variables.width=(state.structure.width*k).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
  state.variables.height=(state.structure.height*k).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
}
function applyTemplate(template){
  const preset=stateForTemplate(template,state.variables);
  state.structure=preset.structure;state.elements=preset.elements;state.selectedId=preset.selectedId;
  state.variables={...preset.variables,dimensionUnit:template==='mailer-150010'?'MM':'INCH'};
  state.projectName=template==='mailer-150010'?'Mailer 150010 / Demo Project':'美线侧封箱 / Demo Project';
  state.foldProgress=100;state.batch={...defaultState.batch};syncShippingDimensions();
}

function navButton(key,label){return `<button data-nav="${key}" class="${state.page===key?'active':''}">${label}</button>`}
function toolButton(name,icon,title,{disabled=false}={}){return `<button class="tool ${activeTool===name?'active':''}" data-tool="${name}" title="${title}${disabled?' · Coming next':''}" ${disabled?'disabled aria-disabled="true"':''}>${iconV67(name)}</button>`}

function render(){
  disposeThreePreview();threeController=null;
  renderShell(state.page==='editor'?editorContent():pageContent());
  bindCommon();
  if(state.page==='editor')bindEditor(); else bindPage();
}

function renderShell(content){
  app.innerHTML=`<div class="app"><header class="topbar"><div class="brand">BOXSTUDIO <small>V0.8</small></div><nav class="nav">${navButton('dashboard','Dashboard')}${navButton('templates','Templates')}${navButton('projects','Projects')}${navButton('editor','Editor')}${navButton('marks','Marks')}${navButton('mark-studio','独立唛头')}</nav><span class="save-state"></span><button class="primary" id="quickExport">Export</button></header>${content}</div>`;
}
function bindCommon(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{state.page=b.dataset.nav;persist();render()});
  const ex=document.querySelector('#quickExport');if(ex)ex.onclick=()=>{state.page='editor';state.editorTab='Export';persist();render()};
  updateSaveState();
}
function bindPage(){
  document.querySelectorAll('[data-open-editor]').forEach(b=>b.onclick=()=>{state.page='editor';state.editorTab=b.dataset.openEditor||'Design';persist();render()});
  document.querySelectorAll('[data-use-template]').forEach(b=>b.onclick=()=>setState(s=>{applyTemplate(b.dataset.useTemplate);s.page='editor';s.editorTab='Structure'}));
  const reset=document.querySelector('#resetDemo');if(reset)reset.onclick=resetDemo;
}

function pageContent(){
  if(state.page==='mark-studio')return '<main data-v67-mark-page class="v67-mark-page"></main>';
  if(state.page==='dashboard')return `<main class="page"><div class="page-head"><div><h1>Dashboard</h1><p class="muted">参数化结构、导入刀版、真实条码、Hinge Pivot 3D、批量唛头与生产文件集中在一个项目内。</p></div><button class="primary" data-open-editor="Design">打开编辑器</button></div><div class="kpis"><div class="kpi"><b>1</b><span>Projects</span></div><div class="kpi"><b>2 + Import</b><span>Structure sources</span></div><div class="kpi"><b>${state.elements.length}</b><span>Mark elements</span></div><div class="kpi"><b>${state.batch.rows.length}</b><span>Batch rows</span></div></div><h2>最近项目</h2><div class="cards"><div class="card"><div class="eyebrow">${esc(templateLabel().toUpperCase())}</div><h3>${esc(state.projectName)}</h3><p class="muted">${state.structure.template==='imported'?`${Math.round(geo().width)}×${Math.round(geo().height)} mm imported artboard`:`${state.structure.layers} 层 ${esc(state.structure.flute)} 楞 · ${state.structure.length}×${state.structure.width}×${state.structure.height} mm`}</p><div class="card-actions"><button class="primary" data-open-editor="Design">继续设计</button><button class="mini" data-open-editor="3D">3D Fold</button><button class="mini" data-open-editor="Preflight">Preflight</button></div></div></div></main>`;
  if(state.page==='templates'){const std=STANDARD_TEMPLATE_CATALOG.map(t=>`<div class="card"><div class="eyebrow">${esc(t.standard)} · ${esc(t.code)}</div><h3>${esc(t.name)}</h3><p class="muted">Template schema v1 · ${t.parameters.map(esc).join(' / ')}</p><div class="badge">${esc(t.status)}</div>${t.engine?`<div class="card-actions"><button class="primary" data-use-template="${esc(t.engine)}">使用结构</button></div>`:'<div class="notice template-ref">仅建立标准模板数据结构；未生成未经验证的刀版几何。</div>'}</div>`).join('');return `<main class="page"><div class="page-head"><div><h1>Templates</h1><p class="muted">V0.8 保留标准模板 schema，并新增 PDF / PDF-compatible AI 矢量刀版导入。只有已验证引擎可直接生成；FEFCO/ECMA 未实现条目不会伪造几何。</p></div></div><div class="cards">${std}<div class="card"><div class="eyebrow">IMPORT · VECTOR</div><h3>SVG / DXF / PDF / AI Dieline</h3><p class="muted">PDF-compatible AI、Spot 语义、Bezier/Arc、Polygon Panel、Topology/Intersection 检查。</p><div class="card-actions"><button class="primary" data-open-editor="Structure">进入导入器</button></div></div></div></main>`;}
  if(state.page==='projects')return `<main class="page"><h1>Projects</h1><div class="cards"><div class="card"><h3>${esc(state.projectName)}</h3><p class="muted">自动保存在浏览器 localStorage。结构、导入刀线、变量、批量映射与位置都会保存。</p><div class="card-actions"><button class="primary" data-open-editor="Design">Open</button><button class="mini" id="resetDemo">Reset Demo Data</button></div></div></div></main>`;
  if(state.page==='marks')return `<main class="page"><div class="page-head"><div><h1>Marks Library</h1><p class="muted">结构化唛头组件、五类真实一维码、QR 与 Excel 多 Sheet 字段映射。</p></div><button class="primary" data-open-editor="Marks">批量唛头</button></div><div class="cards">${['SKU Block','Weight Block','Measurement','Origin','Package Notice','Barcode + QR Group','This Side Up','Fragile','Keep Dry','Excel / CSV Batch'].map((x,i)=>`<div class="card"><div class="mark-preview">${['SKU','N.W. / G.W.','L×W×H','Made in','Pkg X/Y','▥ ▦','↑↑','♢','☂','XLSX'][i]}</div><h3>${x}</h3><p class="muted">${x==='Barcode + QR Group'?'Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128 + 可扫描 QR。':x==='Excel / CSV Batch'?'读取 .xlsx / .csv，多 Sheet、手工字段映射并批量导出。':'可绑定变量或作为矢量运输标识使用。'}</p></div>`).join('')}</div></main>`;
  return '';
}

function editorContent(){
  const g=geo();
  return `<div class="workspace"><aside class="toolbar">${toolButton('select','↖','Select')}${toolButton('text','T','Text')}${toolButton('image','▧','Image',{disabled:true})}${toolButton('shape','□','Rectangle')}${toolButton('line','╱','Line')}${toolButton('barcode','▥','Barcode + QR Group')}${toolButton('qr','▦','Select QR Group')}${toolButton('mark','⇧','Shipping Mark')}${toolButton('var','{}','Variable Text')}${toolButton('dieline','⌁','Structure / Dieline')}</aside><section class="main"><div class="tabbar">${['Design','Structure','Marks','3D','Preflight','Export'].map(t=>`<button data-tab="${t}" class="${state.editorTab===t?'active':''}">${t}</button>`).join('')}<span class="spacer"></span><button id="undo" title="Ctrl/Cmd+Z" ${historyIndex<=0?'disabled':''}>撤销</button><button id="redo" title="Ctrl/Cmd+Shift+Z" ${historyIndex>=history.length-1?'disabled':''}>重做</button></div>${editorBody(g)}<div class="status"><span>Unit: mm</span><span>Document: ${Math.round(g.width)} × ${Math.round(g.height)} mm</span><span>${esc(templateLabel())}: ${state.structure.length} × ${state.structure.width} × ${state.structure.height}</span><div class="right"><label><input id="gridToggle" type="checkbox" ${state.grid?'checked':''}> Grid</label><label><input id="guideToggle" type="checkbox" ${state.guides?'checked':''}> Guides</label><label class="zoomctl"><input id="zoomRange" type="range" min="10" max="800" value="${state.zoom}"> <span id="zoomLabel">${state.zoom}%</span></label></div></div></section><aside class="rightpanel">${rightPanel(g)}</aside></div>`;
}

function editorBody(g){
  if(state.editorTab==='3D')return threeBody(g);
  if(state.editorTab==='Preflight')return preflightBody();
  if(state.editorTab==='Export')return exportBody();
  const css=fitCssSize(g,state.zoom);
  return `<div class="canvas-shell"><div class="canvas-wrap"><svg id="designSvg" class="paper" viewBox="0 0 ${g.width} ${g.height}" style="width:${css.width}px;height:${css.height}px" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#edf0f2" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="#fff"/>${state.grid?'<rect width="100%" height="100%" class="grid-bg ui-only"/>':''}${state.showRulers?rulerSvg(g):''}${state.guides?guideSvg(g):''}${dielineSvg(g)}${foldOverlaySvg(g)}${dielineEditSvg(g)}${curveEditSvg()}${elementsSvg(g)}</svg></div></div>`;
}

function rulerSvg(g){
  let out='<g class="ui-only ruler-svg">';
  for(let x=0;x<=g.width;x+=100){const major=x%500===0;out+=`<line x1="${x}" y1="0" x2="${x}" y2="${major?30:16}"/><text x="${x+5}" y="${major?26:14}">${major?x:''}</text>`}
  for(let y=0;y<=g.height;y+=100){const major=y%500===0;out+=`<line x1="0" y1="${y}" x2="${major?30:16}" y2="${y}"/><text x="5" y="${y-5}">${major?y:''}</text>`}
  return out+'</g>';
}
function guideSvg(g){
  const bleed=(g.bleedRects||[]).map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" class="guide-bleed"/>`).join('')+(g.bleedPolygons||[]).map(r=>`<polygon points="${r.points.map(p=>p.join(',')).join(' ')}" class="guide-bleed"/>`).join('');
  const safe=(g.safeRects||[]).map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" class="guide-safe"/>`).join('')+(g.safePolygons||[]).map(r=>`<polygon points="${r.points.map(p=>p.join(',')).join(' ')}" class="guide-safe"/>`).join('');
  return `<g class="ui-only">${bleed}${safe}</g>`;
}
function foldOverlaySvg(g){
  if(state.editorTab!=='Structure'||g.template!=='imported')return'';
  const selected=new Set(state.panelEdit?.selected||[]),panels=(g.bodyPanels||[]).map(p=>p.points?.length>=3?`<polygon data-panel-id="${esc(p.id)}" points="${p.points.map(q=>q.join(',')).join(' ')}" class="panel-edit-box ${selected.has(p.id)?'selected':''}"/>`:`<rect data-panel-id="${esc(p.id)}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" class="panel-edit-box ${selected.has(p.id)?'selected':''}"/>`).join('');
  const folds=(g.foldCandidates||[]).map(f=>{const h=f.hinge||{},mx=((h.x1||0)+(h.x2||0))/2,my=((h.y1||0)+(h.y2||0))/2,label=f.confirmed?(Number(f.angle)<0?'V':'M'):'?';return `<g class="fold-overlay ${f.confirmed?(Number(f.angle)<0?'valley':'mountain'):'candidate'}"><line x1="${h.x1||0}" y1="${h.y1||0}" x2="${h.x2||0}" y2="${h.y2||0}"/><circle cx="${mx}" cy="${my}" r="7"/><text x="${mx}" y="${my+3}" text-anchor="middle">${label}</text></g>`}).join('');
  return `<g class="ui-only fold-graph-overlay">${panels}${folds}</g>`;
}
function dielineSvg(g){
  if(state.hiddenGroups.dieline)return'';
  const cuts=g.cutLines.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="dieline-cut"/>`).join('');
  const creases=g.creaseLines.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="dieline-crease"/>`).join('');
  const perfs=(g.perfLines||[]).map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="dieline-perf"/>`).join('');
  const glues=(g.glueLines||[]).map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="dieline-glue"/>`).join('');
  const curveSvg=(arr,cls)=>(arr||[]).map(c=>`<path d="${curveToPath(c)}" class="${cls}"/>`).join('');
  const curves=curveSvg(g.cutCurves,'dieline-cut')+curveSvg(g.creaseCurves,'dieline-crease')+curveSvg(g.perfCurves,'dieline-perf')+curveSvg(g.glueCurves,'dieline-glue');
  const labels=g.bodyPanels.map(p=>`<text x="${p.x+p.w/2}" y="${p.y+p.h/2}" text-anchor="middle" class="panel-label ui-only">${esc(p.label)}${p.points?.length?' · POLY':''}</text>`).join('');
  return `<g id="dieline-layer">${cuts}${creases}${perfs}${glues}${curves}${labels}</g>`;
}


function dielineSets(){
  const src=state.structure?.importedGeometry;if(!src)return{};
  return {CUT:src.cutLines||[],CREASE:src.creaseLines||[],PERF:src.perfLines||[],GLUE:src.glueLines||[]};
}
function selectedDielineLine(){
  if(state.structure.template!=='imported')return null;const e=state.dielineEdit||defaultState.dielineEdit,arr=dielineSets()[e.kind]||[];return arr[Math.max(0,Math.min(arr.length-1,Number(e.index)||0))]||null;
}
function dielineEditSvg(){
  if(state.editorTab!=='Structure'||state.structure.template!=='imported')return'';const e=state.dielineEdit||defaultState.dielineEdit,l=selectedDielineLine();if(!l)return'';
  return `<g class="ui-only dieline-node-edit"><line id="selectedDielineLine" x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/><circle data-dieline-handle="1" cx="${l.x1}" cy="${l.y1}" r="6"/><circle data-dieline-handle="2" cx="${l.x2}" cy="${l.y2}" r="6"/><text x="${(l.x1+l.x2)/2+8}" y="${(l.y1+l.y2)/2-8}">${esc(e.kind)} #${Number(e.index||0)+1}</text></g>`;
}

function curveSets(){
  const src=state.structure?.importedGeometry;if(!src)return{};
  return {CUT:src.cutCurves||[],CREASE:src.creaseCurves||[],PERF:src.perfCurves||[],GLUE:src.glueCurves||[]};
}
function selectedCurve(){
  if(state.structure.template!=='imported')return null;const e=state.curveEdit||defaultState.curveEdit,arr=curveSets()[e.kind]||[];return arr[Math.max(0,Math.min(arr.length-1,Number(e.index)||0))]||null;
}
function curveHandlePoints(c){
  if(!c)return[];const pts=[['start',c.x1,c.y1],['end',c.x2,c.y2]];
  if(c.type==='C')pts.push(['c1',c.c1x,c.c1y],['c2',c.c2x,c.c2y]);
  if(c.type==='Q')pts.push(['c',c.cx,c.cy]);
  return pts;
}
function curveEditSvg(){
  if(state.editorTab!=='Structure'||state.structure.template!=='imported')return'';const e=state.curveEdit||defaultState.curveEdit,c=selectedCurve();if(!c)return'';
  const pts=curveHandlePoints(c);let helpers='';
  if(c.type==='C')helpers=`<line x1="${c.x1}" y1="${c.y1}" x2="${c.c1x}" y2="${c.c1y}"/><line x1="${c.x2}" y1="${c.y2}" x2="${c.c2x}" y2="${c.c2y}"/>`;
  if(c.type==='Q')helpers=`<line x1="${c.x1}" y1="${c.y1}" x2="${c.cx}" y2="${c.cy}"/><line x1="${c.x2}" y1="${c.y2}" x2="${c.cx}" y2="${c.cy}"/>`;
  return `<g class="ui-only curve-node-edit"><path id="selectedCurvePath" d="${curveToPath(c)}"/>${helpers}${pts.map(([k,x,y])=>`<circle data-curve-handle="${k}" cx="${x}" cy="${y}" r="${k==='start'||k==='end'?6:5}"/>`).join('')}<text x="${c.x1+8}" y="${c.y1-8}">${esc(e.kind)} ${c.type} curve #${Number(e.index||0)+1}</text></g>`;
}

function iconSvg(el,g){
  const rr=resolveElementRect(el,g),x=rr.absX,y=rr.absY;
  const common=`transform="translate(${x} ${y}) rotate(${el.r||0} ${el.w/2} ${el.h/2})" data-element-id="${el.id}" class="element-hit"`;
  if(el.icon==='up')return `<g ${common}><rect width="${el.w}" height="${el.h}" fill="white" stroke="#111" stroke-width="1.5"/><path d="M ${el.w*.3} ${el.h*.70} V ${el.h*.26} M ${el.w*.3} ${el.h*.26} l -8 10 M ${el.w*.3} ${el.h*.26} l 8 10 M ${el.w*.7} ${el.h*.70} V ${el.h*.26} M ${el.w*.7} ${el.h*.26} l -8 10 M ${el.w*.7} ${el.h*.26} l 8 10" stroke="#111" stroke-width="3" fill="none"/></g>`;
  if(el.icon==='fragile')return `<g ${common}><rect width="${el.w}" height="${el.h}" fill="white" stroke="#111" stroke-width="1.5"/><path d="M ${el.w*.28} ${el.h*.16} H ${el.w*.72} L ${el.w*.61} ${el.h*.48} H ${el.w*.39} Z M ${el.w*.5} ${el.h*.48} V ${el.h*.76} M ${el.w*.34} ${el.h*.76} H ${el.w*.66}" stroke="#111" stroke-width="2.5" fill="none"/></g>`;
  return `<g ${common}><rect width="${el.w}" height="${el.h}" fill="white" stroke="#111" stroke-width="1.5"/><path d="M ${el.w*.18} ${el.h*.44} Q ${el.w*.5} ${el.h*.12} ${el.w*.82} ${el.h*.44} H ${el.w*.18} M ${el.w*.5} ${el.h*.44} V ${el.h*.78}" stroke="#111" stroke-width="2.5" fill="none"/><path d="M ${el.w*.3} ${el.h*.84} q 5 -7 10 0 q 5 -7 10 0" stroke="#111" fill="none"/></g>`;
}
function textBlock(el,text,g){
  const rr=resolveElementRect(el,g),lines=String(text).split('\n');
  return `<g transform="translate(${rr.absX} ${rr.absY}) rotate(${el.r||0} ${el.w/2} ${el.h/2})" data-element-id="${el.id}" class="element-hit"><rect width="${el.w}" height="${el.h}" fill="rgba(255,255,255,.01)" stroke="none"/>${lines.map((line,i)=>`<text x="4" y="${Math.min(el.h-4,(i+1)*(el.fontSize||14)+2)}" class="svg-text" font-size="${el.fontSize||14}" ${el.bold?'font-weight="700"':''}>${esc(line)}</text>`).join('')}</g>`;
}
function barcodeQrSvg(el,g){
  const rr=resolveElementRect(el,g), barcodeValue=renderTemplate(el.barcodeValue,state.variables), qrValue=renderTemplate(el.qrValue,state.variables);
  const {pad,gap,qrSide,bw,bh,fontSize,labelBaseline,stroke}=barcodeGroupLayoutV70(el);
  let bars;try{bars=barcodeSvg(el.barcodeType||'CODE39',barcodeValue,bw,bh)}catch(err){return `<g transform="translate(${rr.absX} ${rr.absY})" data-element-id="${el.id}" class="element-hit"><rect width="${el.w}" height="${el.h}" fill="#fff" stroke="#c74c4c" stroke-width="2"/><text x="8" y="20" class="warning-label">BARCODE ERROR: ${esc(err.message)}</text></g>`}let qr;
  try{qr=qrSvgRects(qrValue,qrSide,qrSide)}catch(err){return `<g transform="translate(${rr.absX} ${rr.absY})" data-element-id="${el.id}" class="element-hit"><rect width="${el.w}" height="${el.h}" fill="#fff" stroke="#c74c4c" stroke-width="2"/><text x="8" y="20" class="warning-label">QR ERROR: ${esc(err.message)}</text></g>`}
  const qx=el.w-pad-qrSide,qy=pad;
  return `<g transform="translate(${rr.absX} ${rr.absY}) rotate(${el.r||0} ${el.w/2} ${el.h/2})" data-element-id="${el.id}" class="element-hit"><rect width="${el.w}" height="${el.h}" fill="#fff" stroke="#111" stroke-width="${stroke}"/>${bars.bearer?`<rect x="${pad}" y="${pad}" width="${bw}" height="${bh}" fill="none" stroke="#111" stroke-width="${2*el.w/250}"/>`:''}<g transform="translate(${pad} ${pad})" fill="#111">${bars.rects}</g><text x="${pad+bw/2}" y="${labelBaseline}" text-anchor="middle" class="svg-text" font-size="${fontSize}">${esc(bars.label)}</text><g transform="translate(${qx} ${qy})"><rect width="${qrSide}" height="${qrSide}" fill="#fff"/><g fill="#111">${qr.rects}</g></g><line x1="${qx-gap/2}" y1="${pad}" x2="${qx-gap/2}" y2="${el.h-pad}" stroke="#d1d5db" stroke-width="${el.w/250}"/></g>`;
}
function shapeSvg(el,g){const rr=resolveElementRect(el,g);return `<g transform="translate(${rr.absX} ${rr.absY}) rotate(${el.r||0} ${el.w/2} ${el.h/2})" data-element-id="${el.id}" class="element-hit"><rect width="${el.w}" height="${el.h}" fill="${el.fill||'none'}" stroke="#111" stroke-width="2"/></g>`}
function lineSvg(el,g){const rr=resolveElementRect(el,g);return `<g transform="translate(${rr.absX} ${rr.absY}) rotate(${el.r||0} ${el.w/2} ${el.h/2})" data-element-id="${el.id}" class="element-hit"><line x1="0" y1="0" x2="${el.w}" y2="${el.h}" stroke="#111" stroke-width="2"/><rect width="${Math.max(6,el.w)}" height="${Math.max(6,el.h)}" fill="transparent"/></g>`}
function selectionSvg(el,g){const rr=resolveElementRect(el,g);return `<rect class="selection-box ui-only" x="${rr.absX-5}" y="${rr.absY-5}" width="${el.w+10}" height="${el.h+10}"/>`}
function elementsSvg(g){
  if(state.hiddenGroups.marks)return'';let out='';
  for(const el of state.elements){
    if(el.type==='notice'&&!isPackageNoticeVisible(state.variables))continue;
    if(!g.panelMap[el.panelId])continue;
    if(el.type==='text'||el.type==='notice')out+=textBlock(el,renderTemplate(el.template,state.variables),g);
    else if(el.type==='barcode-qr-group')out+=barcodeQrSvg(el,g);
    else if(el.type==='icon')out+=iconSvg(el,g);
    else if(el.type==='shape')out+=shapeSvg(el,g);
    else if(el.type==='line')out+=lineSvg(el,g);
    if(el.id===state.selectedId)out+=selectionSvg(el,g);
  }
  return `<g id="artwork-layer">${out}</g>`;
}

function preflightBody(){
  const results=runPreflight(state),counts={pass:0,warning:0,error:0};results.forEach(x=>counts[x.severity]++);
  return `<div class="canvas-shell"><div class="review-page"><div class="review-head"><div><div class="eyebrow">LIVE CHECK</div><h2>Preflight</h2><p class="muted">检查读取当前模板、Fold Graph、变量和画布对象，不使用固定演示结果。</p></div><div class="score"><span class="pass">${counts.pass} Passed</span><span class="warning">${counts.warning} Warning</span><span class="error">${counts.error} Error</span></div></div><div class="preflight">${results.map(item=>`<div class="check ${item.severity}"><div class="icon">${item.severity==='pass'?'✓':item.severity==='warning'?'!':'×'}</div><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div></div>`).join('')}</div></div></div>`;
}
function exportBody(){
  const o=state.exportOptions||{},outline=Boolean(o.outlineText),mode=o.fontMode||'technical',ttf=userTtfInfo(),spot=o.spotDielines!==false,overprint=o.overprintDielines!==false,pdfx=o.pdfxMode==='candidate',icc=outputIccInfo(),profile=o.printProfile||'generic';
  const profileOptions=Object.values(PRINT_PROFILES).map(p=>`<option value="${p.id}" ${profile===p.id?'selected':''}>${esc(p.label)}</option>`).join('');
  const spotFields=['CUT','CREASE','PERF','GLUE'].map(k=>`<div class="field"><label>${k} spot name</label><input data-spot-kind="${k}" value="${esc(spotNameFor(o,k))}"></div>`).join('');
  return `<div class="canvas-shell"><div class="review-page"><div class="review-head"><div><div class="eyebrow">PRODUCTION OUTPUT</div><h2>Export</h2><p class="muted">V0.8 增加自定义印前 Profile、用户 CMYK ICC OutputIntent 与 PDF/X-4 Candidate 输出门控。Candidate 不是第三方认证，仍需专业 preflight 验证。</p></div></div>
  <div class="outline-option"><label><input id="outlineTextExport" type="checkbox" ${outline?'checked':''}> <b>Text → Vector Outlines</b></label><div class="field"><label>Outline source</label><select id="fontMode"><option value="technical" ${mode==='technical'?'selected':''}>BoxStudio Technical Vector</option><option value="ttf" ${mode==='ttf'?'selected':''}>Uploaded TrueType (.ttf) Exact glyf Outline</option></select></div><label class="file-drop compact"><input id="ttfFile" type="file" accept=".ttf,font/ttf"><b>Load licensed/user-owned TTF</b><span>${ttf?`${esc(ttf.name)} · ${ttf.unitsPerEm} UPM · ${ttf.numGlyphs} glyphs`:'当前会话未加载 TTF。字体文件不会打包进项目，也不会随导出分享。'}</span></label>${ttf?'<button class="mini" id="clearTtf">Clear loaded font</button>':''}<p>TTF 模式读取用户字体 glyf/cmap/hmtx 并输出真实 path；当前不支持 CFF/CFF2 OTF。</p></div>
  <div class="outline-option"><div class="field"><label>Print profile</label><select id="printProfile">${profileOptions}</select></div><label><input id="spotDielines" type="checkbox" ${spot?'checked':''}> <b>Dieline Spot Separations</b></label><label><input id="overprintDielines" type="checkbox" ${overprint?'checked':''}> <b>Overprint dielines</b></label><div class="export-settings-grid">${spotFields}</div><p>Spot 名称会同时写入 PDF Separation 与 SVG data-spot-name。修改任一名称会自动切换为 Custom Profile。</p></div>
  <div class="outline-option"><div class="field"><label>PDF mode</label><select id="pdfxMode"><option value="off" ${!pdfx?'selected':''}>Production PDF</option><option value="candidate" ${pdfx?'selected':''}>PDF/X-4 Candidate</option></select></div><label class="file-drop compact"><input id="iccFile" type="file" accept=".icc,.icm,application/vnd.iccprofile"><b>Load user-supplied CMYK ICC / ICM</b><span>${icc?`${esc(icc.name)} · ${esc(icc.colorSpace||'Unknown')} · ${icc.size} bytes · ICC ${esc(icc.version)}`:'当前会话未加载 ICC。Candidate 模式需要 CMYK ICC OutputIntent。ICC 仅保存在当前页面会话。'}</span></label>${icc?'<button class="mini" id="clearIcc">Clear loaded ICC</button>':''}<div class="export-settings-grid"><div class="field"><label>OutputConditionIdentifier</label><input id="outputConditionIdentifier" value="${esc(o.outputConditionIdentifier||'Custom CMYK')}"></div><div class="field"><label>OutputCondition Info</label><input id="outputConditionInfo" value="${esc(o.outputConditionInfo||'User supplied CMYK ICC output profile')}"></div></div><p>Candidate 模式会写入 OutputIntent、DestOutputProfile、XMP、GTS_PDFXVersion、TrimBox/BleedBox，并要求文字转曲；不把未满足条件的文件伪装成 PDF/X。</p></div>
  <div class="export-grid"><div class="export-card"><div class="filetype">SVG</div><h4>Production SVG</h4><p class="muted">1:1 mm；${outline?(mode==='ttf'?'用户 TTF glyf 精确路径。':'技术矢量字形。'):'保留 SVG text。'}</p><button class="primary" id="exportSvg">Export SVG</button></div><div class="export-card"><div class="filetype">PNG</div><h4>Preview PNG</h4><p class="muted">高分辨率视觉预览，不作为 spot separation 生产文件。</p><button class="primary" id="exportPng">Export PNG</button></div><div class="export-card"><div class="filetype">PDF</div><h4>${pdfx?'PDF/X-4 Candidate':'Production PDF 1:1'}</h4><p class="muted">${pdfx?'CMYK ICC OutputIntent + XMP + outlined text gate。':`CMYK artwork + ${spot?'Separation spots':'Process Black dielines'} + Overprint ${overprint?'ON':'OFF'}。`}</p><button class="primary" id="exportPdf">Export PDF</button></div><div class="export-card"><div class="filetype">DXF</div><h4>Structure DXF</h4><p class="muted">R12 ASCII DXF，CUT / CREASE / PERF / GLUE 分层。</p><button class="primary" id="exportDxf">Export DXF</button></div></div><div class="notice strong-note"><b>PDF/X boundary:</b> V0.8 的 Candidate 是受约束的生产输出路线，不等于 Acrobat/Callas 等专业工具的合规认证。未加载 CMYK ICC、未转曲或存在 PDF 未实现旋转对象时会阻断 Candidate 导出。</div></div></div>`;
}
function threeBody(g){
  const graph=buildFoldGraph(g),stats=graphStats(graph);
  return `<div class="canvas-shell three-page"><div class="three-toolbar"><div><div class="eyebrow">PANEL / FOLD GRAPH</div><strong>${esc(templateLabel())}</strong> · ${stats.panels} panels · ${stats.hinges} hinges</div><label>Fold <input id="foldRange" type="range" min="0" max="100" value="${state.foldProgress}"> <b id="foldLabel">${state.foldProgress}%</b></label></div><div id="threeCanvas" class="three-webgl"></div><div class="three-help">拖动旋转 · 滚轮缩放 · Fold 0% = 平面刀版 / 100% = 组装状态</div></div>`;
}

function rightPanel(g){
  if(state.editorTab==='Preflight')return `<div class="panel-section"><h3>Preflight</h3><div class="notice">规则会检查必填字段、多包裹条件、QR 编码、Barcode+QR 比例、对象越界、Fold Graph 与结构补偿状态。</div></div>`;
  if(state.editorTab==='Export')return `<div class="panel-section"><h3>Export</h3><div class="notice">V0.8 支持自定义 Spot Profile、Overprint、用户 TTF 转曲与用户 CMYK ICC OutputIntent。</div></div><div class="panel-section"><h3>PDF/X-4 Candidate</h3><div class="notice">开启 Candidate 后会执行导出门控并写入 OutputIntent + XMP；仍需专业 preflight 软件做最终验证。</div></div>`;
  if(state.editorTab==='3D')return foldGraphPanel(g);
  if(state.editorTab==='Structure')return structurePanel(g);

  const el=state.elements.find(e=>e.id===state.selectedId);
  return `<div class="panel-section"><div class="section-title"><h3>Data</h3><label class="micro"><input id="syncDims" type="checkbox" ${state.syncDimensions?'checked':''}> 尺寸跟随结构</label></div>${Object.entries(state.variables).map(([k,v])=>`<div class="field"><label>${k}</label><input data-var="${k}" value="${esc(v)}"></div>`).join('')}</div><div class="panel-section"><h3>Layers</h3><div class="layer"><input type="checkbox" data-layer-visible="dieline" ${!state.hiddenGroups.dieline?'checked':''}><span class="name">Dieline</span><span class="badge">locked</span></div><div class="layer"><input type="checkbox" data-layer-visible="marks" ${!state.hiddenGroups.marks?'checked':''}><span class="name">Marks</span><span class="badge">editable</span></div></div>${state.editorTab==='Marks'?batchPanel():''}${el?propertiesPanel(el,g):''}<div class="panel-section"><h3>Project</h3><div class="row"><button class="mini" id="resetDemo">Reset Demo</button><button class="mini" id="openReference">PDF Vector Ref</button></div></div>`;
}
function structurePanel(g){
  const s=state.structure,m=g.manufacturing,isMailer=s.template==='mailer-150010',isImported=s.template==='imported';
  const importBox=`<div class="panel-section"><h3>Import Dieline</h3><label class="file-drop"><input id="dielineFile" type="file" accept=".svg,.dxf,.pdf,.ai,image/svg+xml,application/dxf,application/pdf"><b>Import SVG / DXF / PDF / AI</b><span>PDF-compatible AI · Spot/颜色线型识别 · SVG Transform · Bezier / Arc</span></label><div class="batch-samples"><a href="./assets/sample-dieline.svg" download>Sample SVG</a><a href="./assets/sample-transform-curves.svg" download>Transform + Curves</a><a href="./assets/sample-dieline.dxf" download>Sample DXF</a><a href="./assets/sample-dieline.pdf" download>Sample PDF</a><a href="./assets/sample-dieline.ai" download>PDF-compatible AI</a></div><div class="notice">AI 仅支持开启 <b>Create PDF Compatible File</b> 的 Illustrator 文件；Legacy PostScript AI 不会被伪解析。</div></div>`;
  const guideFields=`<div class="panel-section"><h3>Print Guides</h3><div class="field"><label>Bleed mm</label><input type="number" min="0" step="0.1" data-structure="bleed" value="${s.bleed}"></div><div class="field"><label>Safe Area mm</label><input type="number" min="0" step="0.1" data-structure="safe" value="${s.safe}"></div><div class="notice">Bleed / Safe 是实际几何参考，不再只是视觉装饰；Preflight 会检查唛头是否进入 Safe Area。</div></div>`;
  if(isImported){
    const sets=dielineSets(),edit=state.dielineEdit||defaultState.dielineEdit,arr=sets[edit.kind]||[],idx=Math.max(0,Math.min(arr.length-1,Number(edit.index)||0)),ln=arr[idx],src=s.importedGeometry||{};
    const csets=curveSets(),cedit=state.curveEdit||defaultState.curveEdit,carr=csets[cedit.kind]||[],cidx=Math.max(0,Math.min(carr.length-1,Number(cedit.index)||0)),cv=carr[cidx];
    const warnings=(src.warnings||[]).map(w=>`<div class="notice import-warning">${esc(w)}</div>`).join('');
    const fields=ln?['x1','y1','x2','y2'].map(k=>`<div class="field"><label>${k.toUpperCase()} mm</label><input type="number" step="0.1" data-dline-prop="${k}" value="${Number(ln[k]).toFixed(2)}"></div>`).join(''):'<div class="notice">该图层暂无线段，可点击 Add line。</div>';
    let cfields='<div class="notice">该图层没有原生曲线。</div>';
    if(cv){const keys=['x1','y1','x2','y2'];if(cv.type==='C')keys.push('c1x','c1y','c2x','c2y');if(cv.type==='Q')keys.push('cx','cy');if(cv.type==='A')keys.push('rx','ry','rotation');cfields=`<div class="notice"><b>${cv.type}</b> curve · 保持原生控制点</div>`+keys.map(k=>`<div class="field"><label>${k.toUpperCase()}</label><input type="number" step="0.1" data-curve-prop="${k}" value="${Number(cv[k]||0).toFixed(2)}"></div>`).join('')+(cv.type==='A'?`<div class="field"><label>Large Arc</label><select data-curve-prop="largeArc"><option value="0" ${!cv.largeArc?'selected':''}>0</option><option value="1" ${cv.largeArc?'selected':''}>1</option></select></div><div class="field"><label>Sweep</label><select data-curve-prop="sweep"><option value="0" ${!cv.sweep?'selected':''}>0</option><option value="1" ${cv.sweep?'selected':''}>1</option></select></div>`:'');}
    const folds=src.foldCandidates||[],confirmed=folds.filter(f=>f.confirmed).length,root=src.foldRoot||g.bodyPanels[0]?.id||'artboard';
    const foldUi=folds.length?`<div class="field"><label>Root panel</label><select id="foldRoot">${g.bodyPanels.map(p=>`<option value="${p.id}" ${p.id===root?'selected':''}>${esc(p.label)} · ${p.id}</option>`).join('')}</select></div><div class="fold-candidates">${folds.map(f=>`<div class="fold-candidate"><label><input type="checkbox" data-fold-confirm="${esc(f.id)}" ${f.confirmed?'checked':''}> <b>${esc(f.a)}</b> ↔ <b>${esc(f.b)}</b></label><select data-fold-angle="${esc(f.id)}"><option value="90" ${Number(f.angle)!==-90?'selected':''}>Mountain +90°</option><option value="-90" ${Number(f.angle)===-90?'selected':''}>Valley −90°</option></select><span>${esc(f.hinge?.orientation||'')}</span></div>`).join('')}</div>`:'<div class="notice">当前刀版未从 CREASE + Panel 边界推断出可确认折叠关系。可继续编辑刀线或手工创建 Panel。</div>';
    const selectedPanels=(state.panelEdit?.selected||[]).filter(id=>g.panelMap[id]),primary=g.panelMap[selectedPanels[0]],primaryPoly=Boolean(primary?.points?.length>=3);
    const panelFields=primary?(primaryPoly?`<div class="notice"><b>Polygon Panel</b> · bounding box ${primary.w.toFixed(1)} × ${primary.h.toFixed(1)} mm</div><div class="field stack"><label>Points · x,y x,y …</label><textarea id="polygonPoints">${esc(primary.points.map(q=>`${Number(q[0]).toFixed(2)},${Number(q[1]).toFixed(2)}`).join(' '))}</textarea></div><button class="mini full" id="applyPolygonPoints">Apply polygon points</button>`:['x','y','w','h'].map(k=>`<div class="field"><label>${k.toUpperCase()} mm</label><input type="number" step="0.1" data-panel-prop="${k}" value="${Number(primary[k]).toFixed(2)}"></div>`).join('')):'<div class="notice">选择一个 Panel 编辑；选择两个矩形相邻 Panel 可合并。Polygon 使用顶点坐标编辑。</div>';
    const hasPoly=selectedPanels.some(id=>g.panelMap[id]?.points?.length>=3);
    const panelUi=`<div class="panel-section"><div class="section-title"><h3>Manual Panel Editor</h3><span class="badge">${selectedPanels.length} selected</span></div><div class="panel-list">${g.bodyPanels.map(p=>`<label class="panel-row"><input type="checkbox" data-panel-select="${esc(p.id)}" ${(state.panelEdit?.selected||[]).includes(p.id)?'checked':''}><span>${esc(p.label)}</span><b>${p.points?.length?`POLY ${p.points.length}`:`${p.w.toFixed(1)}×${p.h.toFixed(1)}`}</b></label>`).join('')}</div>${panelFields}<div class="row"><button class="mini" id="addPanel">Add Rect</button><button class="mini" id="addPolygonPanel">Add Polygon</button><button class="mini danger" id="deletePanel" ${selectedPanels.length!==1?'disabled':''}>Delete</button></div><div class="field"><label>Split Rect</label><select id="splitOrientation"><option value="vertical" ${(state.panelEdit?.splitOrientation||'vertical')==='vertical'?'selected':''}>Vertical</option><option value="horizontal" ${state.panelEdit?.splitOrientation==='horizontal'?'selected':''}>Horizontal</option></select></div><div class="field"><label>Ratio</label><input id="splitRatio" type="number" min="0.1" max="0.9" step="0.05" value="${state.panelEdit?.splitRatio??0.5}"></div><div class="row"><button class="mini" id="splitPanel" ${selectedPanels.length!==1||hasPoly?'disabled':''}>Split selected</button><button class="mini" id="mergePanels" ${selectedPanels.length!==2||hasPoly?'disabled':''}>Merge 2 rects</button></div><div class="notice">V0.8 支持自由 Polygon Panel。自动 Fold Candidate 暂只使用矩形 Panel；异形面不会被错误当成矩形参与折叠推断。</div></div>`;
    const health=analyzeImportedGeometry(src,Number(state.repairTolerance)||.5);
    const repairUi=`<div class="panel-section"><div class="section-title"><h3>Topology Repair</h3><span class="badge">${health.lineCount} lines</span></div><div class="field"><label>Tolerance mm</label><input id="repairTolerance" type="number" min="0.05" max="5" step="0.05" value="${state.repairTolerance||0.5}"></div><div class="spec-list"><span>degenerate ${health.degenerate}</span><span>duplicates ${health.duplicates}</span><span>near endpoints ${health.nearEndpointPairs}</span><span>CUT crossings ${health.cutIntersections}</span><span>polygon self-x ${health.polygonSelfIntersections}</span></div><button class="mini full" id="repairDieline">Snap endpoints + remove duplicate/zero lines</button><div class="notice">Repair 只处理直线端点拓扑，不会自动删除交叉线，也不会擅自改变 Bezier/Arc 或纸箱工艺尺寸。</div></div>`;
    return `<div class="panel-section"><h3>Template</h3><div class="field"><label>结构</label><select id="templateSelect"><option value="side-seal-rsc">Side-Seal / RSC</option><option value="mailer-150010">Mailer 150010</option><option value="imported" selected>Imported Dieline</option></select></div><div class="notice">${esc(src.source||'Vector')} · ${Math.round(g.width)} × ${Math.round(g.height)} mm · ${g.bodyPanels.length} auto panels</div></div>${importBox}${repairUi}${panelUi}<div class="panel-section"><div class="section-title"><h3>Dieline Line Editor</h3><span class="badge">drag endpoints</span></div><div class="field"><label>Line type</label><select id="dielineKind">${['CUT','CREASE','PERF','GLUE'].map(k=>`<option ${edit.kind===k?'selected':''}>${k}</option>`).join('')}</select></div><div class="field"><label>Line</label><select id="dielineIndex">${arr.map((_,i)=>`<option value="${i}" ${i===idx?'selected':''}>#${i+1}</option>`).join('')}</select></div>${fields}<div class="row"><button class="mini" id="addDielineLine">Add line</button><button class="mini danger" id="deleteDielineLine" ${ln?'':'disabled'}>Delete</button></div></div><div class="panel-section"><div class="section-title"><h3>Bezier / Arc Editor</h3><span class="badge">native curves</span></div><div class="field"><label>Curve type layer</label><select id="curveKind">${['CUT','CREASE','PERF','GLUE'].map(k=>`<option ${cedit.kind===k?'selected':''}>${k}</option>`).join('')}</select></div><div class="field"><label>Curve</label><select id="curveIndex">${carr.map((c,i)=>`<option value="${i}" ${i===cidx?'selected':''}>#${i+1} · ${c.type}</option>`).join('')}</select></div>${cfields}<div class="notice">C/Q 控制柄和起终点可在画布上直接拖动。Arc 保留 rx / ry / rotation / flags；任意 skew transform 下的椭圆弧仍需生产前核对。</div></div><div class="panel-section"><div class="section-title"><h3>CREASE → Fold Graph</h3><span class="badge">${confirmed}/${folds.length} confirmed</span></div>${foldUi}<div class="notice">系统只推断相邻 Panel + CREASE 候选，不自动决定折叠方向。勾选确认后才进入 3D Fold Graph，避免错误折叠关系被当成事实。</div></div>${guideFields}<div class="panel-section"><h3>Imported Semantics</h3><div class="spec-list"><span>CUT ${sets.CUT?.length||0} + ${csets.CUT?.length||0} curves</span><span>CREASE ${sets.CREASE?.length||0} + ${csets.CREASE?.length||0} curves</span><span>PERF ${sets.PERF?.length||0} + ${csets.PERF?.length||0} curves</span><span>GLUE ${sets.GLUE?.length||0} + ${csets.GLUE?.length||0} curves</span><span>Panels ${g.bodyPanels.length}</span></div>${warnings}</div>`;
  }
  const ref=isMailer?`<div class="notice"><b>150010 reference:</b> inside 300×200×60 mm · E-flute 1.5 mm · design area 576×590 mm. 当前默认几何在该尺寸下得到 ${Math.round(g.width)}×${Math.round(g.height)} mm 设计区。</div>`:'';
  return `<div class="panel-section"><h3>Template</h3><div class="field"><label>结构</label><select id="templateSelect">${STANDARD_TEMPLATE_CATALOG.filter(t=>t.engine).map(t=>`<option value="${esc(t.id)}" ${s.template===t.id?'selected':''}>${esc(t.nameZh||t.name)} · ${esc(t.code)}</option>`).join('')}<option value="imported">Imported Dieline</option></select></div><button class="mini full" id="loadTemplateDefaults">Load reference defaults</button></div><div class="panel-section"><h3>Parametric Structure</h3>${[['length','L / 长度'],['width','W / 宽度'],['height','H / 高度'],['thickness','纸厚']].map(([k,l])=>`<div class="field"><label>${l} mm</label><input type="number" step="0.1" data-structure="${k}" value="${s[k]}"></div>`).join('')}${!isMailer?`<div class="field"><label>糊口 mm</label><input type="number" step="0.1" data-structure="glue" value="${s.glue}"></div>`:`<div class="field"><label>Lock wing mm</label><input type="number" step="0.1" data-structure="wing" value="${s.wing}"></div>`}<div class="field"><label>楞型</label><select data-structure="flute">${['E','B','C','EB','BC','AA'].map(v=>`<option ${s.flute===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>层数</label><input type="number" min="1" max="7" data-structure="layers" value="${s.layers}"></div><div class="field"><label>耐破 psi</label><input type="number" data-structure="burstPsi" value="${s.burstPsi}"></div><div class="field checkfield"><label>基础补偿</label><input type="checkbox" data-structure-check="compensation" ${s.compensation?'checked':''}></div><div class="notice">制造尺寸（工程补偿）：L ${m.L.toFixed(1)} / W ${m.W.toFixed(1)} / H ${m.H.toFixed(1)} mm。不是纸箱厂最终压线表。</div>${ref}</div>${guideFields}<div class="panel-section"><h3>Structure semantics</h3><div class="spec-list"><span>CUT</span><span>CREASE</span><span>Panel IDs</span><span>Hinge Pivot</span><span>${esc(s.flute)} flute</span></div></div>${importBox}`;
}
function foldGraphPanel(g){
  const graph=buildFoldGraph(g),stats=graphStats(graph),imported=g.template==='imported',unreached=graph.unreached||[];
  const edgeList=graph.edges.length?`<div class="hinge-list">${graph.edges.map(e=>`<div><span>${esc(e.from)}</span><i>→</i><span>${esc(e.to)}</span><b>${e.angle}° ${e.hinge?.orientation||''}</b></div>`).join('')}</div>`:`<div class="notice">暂无已确认 Hinge。导入刀版请先在 Structure → CREASE → Fold Graph 中确认候选关系。</div>`;
  return `<div class="panel-section"><h3>Fold Graph</h3><div class="graph-stats"><span><b>${stats.panels}</b> Panels</span><span><b>${stats.hinges}</b> Hinges</span></div><div class="notice">Root: <b>${esc(stats.root)}</b>. V0.8 使用共享折线 Hinge-Pivot；导入结构只采用人工确认关系。</div>${imported&&unreached.length?`<div class="notice import-warning">未连接到 Root 的 Panel：${unreached.map(esc).join(', ')}</div>`:''}</div><div class="panel-section"><h3>Hinges</h3>${edgeList}</div><div class="panel-section"><h3>Renderer</h3><div class="notice" id="threeStatus">优先 Three.js；CDN 不可用时自动使用离线 Canvas Hinge-Pivot 3D。</div></div>`;
}
function batchPanel(){
  const b=state.batch||defaultState.batch,rows=b.rows||[],idx=Math.max(0,Math.min(rows.length-1,b.selectedIndex||0)),mapping=(b.mapping&&Object.keys(b.mapping).length)?b.mapping:autoMapHeaders(b.columns||[]);
  const preview=rows.slice(Math.max(0,idx-2),Math.min(rows.length,idx+3)).map((r,i)=>{const actual=Math.max(0,idx-2)+i,headers=b.columns||Object.keys(r).filter(k=>!k.startsWith('__')),mapped=rowToVariables(r,headers,mapping,state.variables);return `<button class="batch-row ${actual===idx?'active':''}" data-batch-row="${actual}"><b>${esc(mapped.sku||`Row ${actual+1}`)}</b><span>Pkg ${esc(mapped.packageIndex||'-')}/${esc(mapped.packageCount||'-')} · ${esc(mapped.crn||'no CRN')}</span></button>`}).join('');
  const sheets=(b.sheets||[]),sheetSelect=sheets.length>1?`<div class="field"><label>Sheet</label><select id="batchSheet">${sheets.map((sh,i)=>`<option value="${i}" ${i===(b.sheetIndex||0)?'selected':''}>${esc(sh.name)} · ${sh.rows.length} rows</option>`).join('')}</select></div>`:'';
  const mapUi=(b.columns||[]).length?`<details class="mapping"><summary>Field mapping · ${b.columns.length} columns</summary>${b.columns.map(h=>`<div class="field"><label title="${esc(h)}">${esc(h)}</label><select data-map-header="${esc(h)}">${VARIABLE_FIELDS.map(([v,l])=>`<option value="${v}" ${(mapping[h]||'')===v?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}<button class="mini full" id="applyMapping">Apply mapping to current row</button></details>`:'';
  return `<div class="panel-section"><div class="section-title"><h3>Batch Marks</h3><span class="badge">${rows.length} rows</span></div><label class="file-drop"><input id="batchFile" type="file" accept=".xlsx,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><b>Import Excel / CSV</b><span>Excel 多 Sheet + 自定义字段映射</span></label><div class="batch-samples"><a href="./assets/sample-batch.xlsx" download>Sample XLSX</a><a href="./assets/sample-batch.csv" download>Sample CSV</a></div>${rows.length?`<div class="batch-file">${esc(b.fileName||'Imported data')}</div>${sheetSelect}${mapUi}<div class="batch-list">${preview}</div><div class="row"><button class="mini" id="prevBatch">← Prev</button><button class="mini" id="nextBatch">Next →</button></div><div class="row batch-export"><button class="mini" id="batchSvg">SVG ZIP</button><button class="mini" id="batchPdf">PDF ZIP</button><button class="mini" id="batchCombinedPdf">Combined PDF</button></div>`:`<div class="notice">第一行作为字段名。导入后可手工映射每一列，不再依赖自动识别。</div>`}</div>`;
}
function propertiesPanel(el,g){
  const p=g.panelMap[el.panelId]||g.panelMap.front||g.bodyPanels[0];if(!p)return'';
  const fields=['x','y','w','h','r'].map(k=>`<div class="field"><label>${k==='r'?'Rotation':k.toUpperCase()} ${k==='r'?'°':'mm'}</label><input type="number" step="0.1" data-prop="${k}" value="${el[k]}" ${el.type==='barcode-qr-group'&&['w','h','r'].includes(k)?'readonly':''}></div>`).join(''),panels=g.bodyPanels.filter(x=>x.kind==='panel').map(x=>`<option value="${x.id}" ${x.id===el.panelId?'selected':''}>${x.label}</option>`).join('');let special='';
  if(el.template!==undefined)special+=`<div class="field stack"><label>Template</label><textarea data-prop="template">${esc(el.template)}</textarea></div>`;if(el.fontSize!==undefined)special+=`<div class="field"><label>Font mm</label><input type="number" step="0.5" data-prop="fontSize" value="${el.fontSize}"></div>`;
  if(el.type==='barcode-qr-group')special+=`<div class="field"><label>Barcode type</label><select id="barcodeType">${BARCODE_TYPES.map(t=>`<option value="${t.value}" ${(el.barcodeType||'CODE39')===t.value?'selected':''}>${t.label}</option>`).join('')}</select></div><div class="field"><label>整体规格</label><select id="barcodePreset"><option value="250x80" ${el.preset==='250x80'?'selected':''}>250 × 80 mm</option><option value="200x64" ${el.preset==='200x64'?'selected':''}>200 × 64 mm</option></select></div><div class="field stack"><label>Barcode</label><input data-prop="barcodeValue" value="${esc(el.barcodeValue)}"></div><div class="field stack"><label>QR value</label><input data-prop="qrValue" value="${esc(el.qrValue)}"></div><div class="notice">优先 250 × 80 mm，空间不足可用 200 × 64 mm；禁止拆分，统一等比例缩放。支持 Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128。GS1-128 可输入 (01)…(10)… 格式；可变长度 AI 会自动插入 FNC1。</div>`;
  return `<div class="panel-section"><h3>Properties · ${esc(el.id)}</h3><div class="field"><label>Panel</label><select data-prop="panelId">${panels}</select></div>${fields}${special}<div class="muted tiny">Panel size: ${p.w.toFixed(1)} × ${p.h.toFixed(1)} mm</div></div>`;
}
function bindEditor(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.editorTab=b.dataset.tab;activeTool='select';persist();render()});
  document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>handleTool(b.dataset.tool));
  const u=document.querySelector('#undo');if(u)u.onclick=undo;const r=document.querySelector('#redo');if(r)r.onclick=redo;
  const grid=document.querySelector('#gridToggle');if(grid)grid.onchange=e=>setState(s=>s.grid=e.target.checked,{history:false});
  const guides=document.querySelector('#guideToggle');if(guides)guides.onchange=e=>setState(s=>s.guides=e.target.checked,{history:false});
  const zoom=document.querySelector('#zoomRange');if(zoom)zoom.oninput=e=>{state.zoom=Number(e.target.value);persist();const g=geo(),css=fitCssSize(g,state.zoom),svg=document.querySelector('#designSvg');if(svg){svg.style.width=css.width+'px';svg.style.height=css.height+'px'};const z=document.querySelector('#zoomLabel');if(z)z.textContent=state.zoom+'%'};

  document.querySelectorAll('[data-var]').forEach(inp=>inp.onchange=e=>setState(s=>{s.variables[e.target.dataset.var]=e.target.value;s.variables=normalizeVariables(s.variables)}));
  const sync=document.querySelector('#syncDims');if(sync)sync.onchange=e=>setState(s=>{s.syncDimensions=e.target.checked;if(s.syncDimensions)syncShippingDimensions()});
  document.querySelectorAll('[data-layer-visible]').forEach(inp=>inp.onchange=e=>setState(s=>s.hiddenGroups[e.target.dataset.layerVisible]=!e.target.checked,{history:false}));
  document.querySelectorAll('[data-structure]').forEach(inp=>inp.onchange=e=>setState(s=>{const k=e.target.dataset.structure;s.structure[k]=e.target.tagName==='SELECT'?e.target.value:Number(e.target.value);syncShippingDimensions()}));
  document.querySelectorAll('[data-structure-check]').forEach(inp=>inp.onchange=e=>setState(s=>{s.structure[e.target.dataset.structureCheck]=e.target.checked;syncShippingDimensions()}));
  document.querySelectorAll('[data-prop]').forEach(inp=>inp.onchange=e=>setState(s=>{const g=geo(),el=s.elements.find(x=>x.id===s.selectedId);if(!el)return;const k=e.target.dataset.prop;if(k==='template'||k==='panelId'||k==='barcodeValue'||k==='qrValue'||k==='barcodeType')el[k]=e.target.value;else if(el.type==='barcode-qr-group'&&['w','h','r'].includes(k))return;else el[k]=Number(e.target.value);Object.assign(el,clampElementToPanel(el,g))}));
  const preset=document.querySelector('#barcodePreset');if(preset)preset.onchange=e=>setState(s=>{const el=s.elements.find(x=>x.id===s.selectedId);if(!el)return;el.preset=e.target.value;if(el.preset==='250x80'){el.w=250;el.h=80}else{el.w=200;el.h=64}Object.assign(el,clampElementToPanel(el,geo()))});
  const barcodeType=document.querySelector('#barcodeType');if(barcodeType)barcodeType.onchange=e=>setState(s=>{const el=s.elements.find(x=>x.id===s.selectedId);if(el)el.barcodeType=e.target.value});

  const templateSelect=document.querySelector('#templateSelect');if(templateSelect)templateSelect.onchange=e=>setState(()=>{if(e.target.value==='imported'){state.structure=defaultsForTemplate('imported');state.elements=[];state.selectedId=null;state.projectName='Imported Dieline / New';state.dielineEdit={kind:'CUT',index:0};state.curveEdit={kind:'CUT',index:0}}else applyTemplate(e.target.value)});
  const loadDefaults=document.querySelector('#loadTemplateDefaults');if(loadDefaults)loadDefaults.onclick=()=>setState(()=>{const t=state.structure.template;if(t==='imported')return;const vars=state.variables;state.structure=defaultsForTemplate(t);state.elements=stateForTemplate(t,vars).elements;state.variables={...vars,dimensionUnit:t==='mailer-150010'?'MM':'INCH'};state.selectedId='sku';syncShippingDimensions()});

  const reset=document.querySelector('#resetDemo');if(reset)reset.onclick=resetDemo;
  const ref=document.querySelector('#openReference');if(ref)ref.onclick=()=>window.open('./assets/sample-dieline.svg','_blank');
  const exs=document.querySelector('#exportSvg');if(exs)exs.onclick=()=>exportSvg(buildHiddenSvg(),state.exportOptions||{});
  const exp=document.querySelector('#exportPng');if(exp)exp.onclick=async()=>await exportPng(buildHiddenSvg(),state.exportOptions||{});
  const expdf=document.querySelector('#exportPdf');if(expdf)expdf.onclick=()=>{try{exportPdf(state)}catch(err){alert('PDF export blocked: '+(err?.message||err))}};
  const exdxf=document.querySelector('#exportDxf');if(exdxf)exdxf.onclick=()=>exportDxf(state);
  const outlineTextExport=document.querySelector('#outlineTextExport');if(outlineTextExport)outlineTextExport.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),outlineText:e.target.checked}},{history:false});
  const fontMode=document.querySelector('#fontMode');if(fontMode)fontMode.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),fontMode:e.target.value}},{history:false});
  const ttfFile=document.querySelector('#ttfFile');if(ttfFile)ttfFile.onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;loadUserTtf(await file.arrayBuffer(),file.name);state.exportOptions={...(state.exportOptions||{}),outlineText:true,fontMode:'ttf'};persist();render()}catch(err){alert('TTF load failed: '+(err?.message||err))}};
  const clearTtfBtn=document.querySelector('#clearTtf');if(clearTtfBtn)clearTtfBtn.onclick=()=>{clearUserTtf();state.exportOptions={...(state.exportOptions||{}),fontMode:'technical'};persist();render()};
  const spotDielines=document.querySelector('#spotDielines');if(spotDielines)spotDielines.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),spotDielines:e.target.checked}},{history:false});
  const overprintDielines=document.querySelector('#overprintDielines');if(overprintDielines)overprintDielines.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),overprintDielines:e.target.checked}},{history:false});
  const printProfile=document.querySelector('#printProfile');if(printProfile)printProfile.onchange=e=>setState(s=>{s.exportOptions=applyPrintProfile(s.exportOptions||{},e.target.value)},{history:false});
  document.querySelectorAll('[data-spot-kind]').forEach(inp=>inp.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),printProfile:'custom',spotNames:{...(s.exportOptions?.spotNames||{}),[e.target.dataset.spotKind]:e.target.value}}},{history:false}));
  const pdfxMode=document.querySelector('#pdfxMode');if(pdfxMode)pdfxMode.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),pdfxMode:e.target.value,outlineText:e.target.value==='candidate'?true:s.exportOptions?.outlineText}},{history:false});
  const iccFile=document.querySelector('#iccFile');if(iccFile)iccFile.onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;const info=loadOutputIcc(await file.arrayBuffer(),file.name);state.exportOptions={...(state.exportOptions||{}),pdfxMode:'candidate',outlineText:true,outputConditionIdentifier:state.exportOptions?.outputConditionIdentifier||file.name};persist();render();if(!info.isCmyk)alert(`ICC loaded, but color space is ${info.colorSpace||'Unknown'}. PDF/X Candidate will remain blocked until a CMYK profile is loaded.`)}catch(err){alert('ICC load failed: '+(err?.message||err))}};
  const clearIccBtn=document.querySelector('#clearIcc');if(clearIccBtn)clearIccBtn.onclick=()=>{clearOutputIcc();state.exportOptions={...(state.exportOptions||{}),pdfxMode:'off'};persist();render()};
  const outputConditionIdentifier=document.querySelector('#outputConditionIdentifier');if(outputConditionIdentifier)outputConditionIdentifier.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),outputConditionIdentifier:e.target.value}},{history:false});
  const outputConditionInfo=document.querySelector('#outputConditionInfo');if(outputConditionInfo)outputConditionInfo.onchange=e=>setState(s=>{s.exportOptions={...(s.exportOptions||{}),outputConditionInfo:e.target.value}},{history:false});

  const dielineFile=document.querySelector('#dielineFile');if(dielineFile)dielineFile.onchange=async e=>{try{const file=e.target.files?.[0],parsed=await parseDielineFile(file);state.structure={...defaultsForTemplate('imported'),length:Math.max(80,parsed.width),width:Math.max(60,parsed.height),height:60,importedGeometry:parsed};state.elements=[];state.selectedId=null;state.projectName=`Imported · ${file.name}`;state.editorTab='Structure';state.dielineEdit={kind:'CUT',index:0};state.curveEdit={kind:'CUT',index:0};pushHistory();render()}catch(err){alert('Dieline import failed: '+(err?.message||err))}};
  const dk=document.querySelector('#dielineKind');if(dk)dk.onchange=e=>setState(s=>{s.dielineEdit.kind=e.target.value;s.dielineEdit.index=0},{history:false});
  const di=document.querySelector('#dielineIndex');if(di)di.onchange=e=>setState(s=>{s.dielineEdit.index=Number(e.target.value)||0},{history:false});
  document.querySelectorAll('[data-dline-prop]').forEach(inp=>inp.onchange=e=>setState(()=>{const l=selectedDielineLine();if(l)l[e.target.dataset.dlineProp]=Number(e.target.value)||0}));
  const addDl=document.querySelector('#addDielineLine');if(addDl)addDl.onclick=()=>setState(()=>{const sets=dielineSets(),kind=state.dielineEdit.kind,arr=sets[kind]||[];arr.push({x1:10,y1:10,x2:80,y2:10,type:kind});state.dielineEdit.index=arr.length-1});
  const delDl=document.querySelector('#deleteDielineLine');if(delDl)delDl.onclick=()=>setState(()=>{const sets=dielineSets(),kind=state.dielineEdit.kind,arr=sets[kind]||[],idx=Math.max(0,Math.min(arr.length-1,Number(state.dielineEdit.index)||0));if(arr.length){arr.splice(idx,1);state.dielineEdit.index=Math.max(0,idx-1)}});
  const ck=document.querySelector('#curveKind');if(ck)ck.onchange=e=>setState(s=>{s.curveEdit.kind=e.target.value;s.curveEdit.index=0},{history:false});
  const ci=document.querySelector('#curveIndex');if(ci)ci.onchange=e=>setState(s=>{s.curveEdit.index=Number(e.target.value)||0},{history:false});
  document.querySelectorAll('[data-curve-prop]').forEach(inp=>inp.onchange=e=>setState(()=>{const c=selectedCurve();if(!c)return;const k=e.target.dataset.curveProp;c[k]=Number(e.target.value)||0}));
  const foldRoot=document.querySelector('#foldRoot');if(foldRoot)foldRoot.onchange=e=>setState(s=>{if(s.structure.importedGeometry)s.structure.importedGeometry.foldRoot=e.target.value});
  document.querySelectorAll('[data-fold-confirm]').forEach(inp=>inp.onchange=e=>setState(s=>{const f=s.structure.importedGeometry?.foldCandidates?.find(x=>x.id===e.target.dataset.foldConfirm);if(f)f.confirmed=e.target.checked}));
  document.querySelectorAll('[data-fold-angle]').forEach(sel=>sel.onchange=e=>setState(s=>{const f=s.structure.importedGeometry?.foldCandidates?.find(x=>x.id===e.target.dataset.foldAngle);if(f)f.angle=Number(e.target.value)||90}));

  document.querySelectorAll('[data-panel-select]').forEach(inp=>inp.onchange=e=>setState(s=>{const id=e.target.dataset.panelSelect,current=new Set(s.panelEdit?.selected||[]);e.target.checked?current.add(id):current.delete(id);s.panelEdit={...(s.panelEdit||{}),selected:[...current].slice(-2)}},{history:false}));
  document.querySelectorAll('[data-panel-prop]').forEach(inp=>inp.onchange=e=>setState(s=>{const id=s.panelEdit?.selected?.[0],src=s.structure.importedGeometry,p=src?.panels?.find(x=>x.id===id);if(!p)return;p[e.target.dataset.panelProp]=Math.max(e.target.dataset.panelProp==='x'||e.target.dataset.panelProp==='y'?0:5,Number(e.target.value)||0);src.foldCandidates=inferFoldCandidates(src.panels||[],src.creaseLines||[])}));
  const addPanelBtn=document.querySelector('#addPanel');if(addPanelBtn)addPanelBtn.onclick=()=>setState(s=>{const src=s.structure.importedGeometry;if(!src)return;s.structure.importedGeometry=addPanel(src,{x:20,y:20,w:80,h:60});const p=s.structure.importedGeometry.panels.at(-1);s.panelEdit={...(s.panelEdit||{}),selected:p?[p.id]:[]}});
  const addPolygonBtn=document.querySelector('#addPolygonPanel');if(addPolygonBtn)addPolygonBtn.onclick=()=>setState(s=>{const src=s.structure.importedGeometry;if(!src)return;s.structure.importedGeometry=addPolygonPanel(src);const p=s.structure.importedGeometry.panels.at(-1);s.panelEdit={...(s.panelEdit||{}),selected:p?[p.id]:[]}});
  const applyPolygonPoints=document.querySelector('#applyPolygonPoints');if(applyPolygonPoints)applyPolygonPoints.onclick=()=>{try{setState(s=>{const id=s.panelEdit?.selected?.[0],raw=document.querySelector('#polygonPoints')?.value||'',pts=raw.trim().split(/\s+/).map(pair=>pair.split(',').map(Number)).filter(q=>q.length===2&&q.every(Number.isFinite));s.structure.importedGeometry=updatePolygonPanel(s.structure.importedGeometry,id,pts)})}catch(err){alert(err?.message||err)}};
  const deletePanelBtn=document.querySelector('#deletePanel');if(deletePanelBtn)deletePanelBtn.onclick=()=>setState(s=>{const id=s.panelEdit?.selected?.[0];if(!id||!s.structure.importedGeometry)return;s.structure.importedGeometry=deletePanel(s.structure.importedGeometry,id);s.panelEdit.selected=[]});
  const splitOrientation=document.querySelector('#splitOrientation');if(splitOrientation)splitOrientation.onchange=e=>setState(s=>{s.panelEdit={...(s.panelEdit||{}),splitOrientation:e.target.value}},{history:false});
  const splitRatio=document.querySelector('#splitRatio');if(splitRatio)splitRatio.onchange=e=>setState(s=>{s.panelEdit={...(s.panelEdit||{}),splitRatio:Math.max(.1,Math.min(.9,Number(e.target.value)||.5))}},{history:false});
  const splitPanelBtn=document.querySelector('#splitPanel');if(splitPanelBtn)splitPanelBtn.onclick=()=>setState(s=>{const id=s.panelEdit?.selected?.[0];if(!id||!s.structure.importedGeometry)return;s.structure.importedGeometry=splitPanel(s.structure.importedGeometry,id,s.panelEdit?.splitOrientation||'vertical',s.panelEdit?.splitRatio||.5);s.panelEdit.selected=[]});
  const mergePanelsBtn=document.querySelector('#mergePanels');if(mergePanelsBtn)mergePanelsBtn.onclick=()=>{try{setState(s=>{s.structure.importedGeometry=mergePanels(s.structure.importedGeometry,s.panelEdit?.selected||[]);s.panelEdit.selected=[]})}catch(err){alert(err?.message||err)}};
  const repairTolerance=document.querySelector('#repairTolerance');if(repairTolerance)repairTolerance.onchange=e=>setState(s=>{s.repairTolerance=Math.max(.05,Math.min(5,Number(e.target.value)||.5))},{history:false});
  const repairDieline=document.querySelector('#repairDieline');if(repairDieline)repairDieline.onclick=()=>setState(s=>{if(s.structure.importedGeometry)s.structure.importedGeometry=repairImportedGeometry(s.structure.importedGeometry,Number(s.repairTolerance)||.5)});


  const batchFile=document.querySelector('#batchFile');if(batchFile)batchFile.onchange=async e=>{try{const file=e.target.files?.[0],wb=await parseBatchWorkbook(file),sh=wb.sheets[0],mapping=autoMapHeaders(sh.headers);state.batch={fileName:file.name,sheets:wb.sheets,sheetIndex:0,rows:sh.rows,columns:sh.headers,selectedIndex:0,mapping};if(sh.rows.length)state.variables=normalizeVariables(rowToVariables(sh.rows[0],sh.headers,mapping,state.variables));pushHistory();render()}catch(err){alert('Batch import failed: '+(err?.message||err))}};
  const batchSheet=document.querySelector('#batchSheet');if(batchSheet)batchSheet.onchange=e=>{const i=Number(e.target.value)||0,sh=state.batch.sheets?.[i];if(!sh)return;state.batch.sheetIndex=i;state.batch.rows=sh.rows;state.batch.columns=sh.headers;state.batch.selectedIndex=0;state.batch.mapping=autoMapHeaders(sh.headers);if(sh.rows.length)state.variables=normalizeVariables(rowToVariables(sh.rows[0],sh.headers,state.batch.mapping,state.variables));pushHistory();render()};
  document.querySelectorAll('[data-map-header]').forEach(sel=>sel.onchange=e=>{state.batch.mapping={...(state.batch.mapping||{}),[e.target.dataset.mapHeader]:e.target.value};persist()});
  const applyMapping=document.querySelector('#applyMapping');if(applyMapping)applyMapping.onclick=()=>applyBatchRow(state.batch.selectedIndex||0);

  document.querySelectorAll('[data-batch-row]').forEach(b=>b.onclick=()=>applyBatchRow(Number(b.dataset.batchRow)));
  const prev=document.querySelector('#prevBatch');if(prev)prev.onclick=()=>applyBatchRow(Math.max(0,(state.batch.selectedIndex||0)-1));
  const next=document.querySelector('#nextBatch');if(next)next.onclick=()=>applyBatchRow(Math.min(state.batch.rows.length-1,(state.batch.selectedIndex||0)+1));
  const bsvg=document.querySelector('#batchSvg');if(bsvg)bsvg.onclick=()=>exportBatchZip('svg');
  const bpdf=document.querySelector('#batchPdf');if(bpdf)bpdf.onclick=()=>exportBatchZip('pdf');
  const bcombined=document.querySelector('#batchCombinedPdf');if(bcombined)bcombined.onclick=()=>exportBatchCombinedPdf();

  const svg=document.querySelector('#designSvg');if(svg){svg.querySelectorAll('[data-element-id]').forEach(node=>node.addEventListener('pointerdown',startDrag));svg.querySelectorAll('[data-dieline-handle]').forEach(node=>node.addEventListener('pointerdown',startDielineDrag));svg.querySelectorAll('[data-curve-handle]').forEach(node=>node.addEventListener('pointerdown',startCurveDrag));svg.querySelectorAll('[data-panel-id]').forEach(node=>node.addEventListener('pointerdown',e=>{const id=e.currentTarget.dataset.panelId,current=new Set(state.panelEdit?.selected||[]);current.has(id)?current.delete(id):current.add(id);state.panelEdit={...(state.panelEdit||{}),selected:[...current].slice(-2)};persist();render();e.stopPropagation()}));svg.addEventListener('pointermove',dragMove);svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointerleave',endDrag);svg.addEventListener('pointerdown',e=>{if(e.target===svg||e.target.tagName==='rect'&&e.target.getAttribute('width')==='100%'){state.selectedId=null;persist();render()}})}

  if(state.editorTab==='3D'){
    const container=document.querySelector('#threeCanvas');
    mountThreePreview(container,state,geo(),{onStatus:(mode)=>{const s=document.querySelector('#threeStatus');if(s)s.textContent=mode==='three'?'Three.js renderer active · hierarchical hinge-pivot kinematics.':'Offline Canvas 3D active · no CDN required · hinge-pivot kinematics.'}}).then(c=>{threeController=c});
    const fold=document.querySelector('#foldRange');if(fold)fold.oninput=e=>{state.foldProgress=Number(e.target.value);persist();const label=document.querySelector('#foldLabel');if(label)label.textContent=state.foldProgress+'%';threeController?.setProgress(state.foldProgress)};
  }
}

function handleTool(tool){
  activeTool=tool;
  if(tool==='select'){render();return}
  if(tool==='dieline'){state.editorTab='Structure';persist();render();return}
  if(tool==='qr'){const group=state.elements.find(e=>e.type==='barcode-qr-group');if(group){state.selectedId=group.id;state.editorTab='Marks';persist();render()}return}
  const g=geo(),front=g.panelMap.front||g.panelMap.base||g.bodyPanels[0];if(!front)return;
  const id=`${tool}-${Date.now().toString(36)}`;
  const maxW=Math.max(20,front.w-20),maxH=Math.max(16,front.h-20);
  if(tool==='text')state.elements.push({id,type:'text',group:'marks',panelId:front.id,x:10,y:Math.max(5,front.h-30),w:Math.min(180,maxW),h:Math.min(24,maxH),r:0,template:'New text',fontSize:Math.min(10,front.h*.18)});
  else if(tool==='var')state.elements.push({id,type:'text',group:'marks',panelId:front.id,x:10,y:10,w:Math.min(180,maxW),h:Math.min(24,maxH),r:0,template:'SKU: {{sku}}',fontSize:Math.min(10,front.h*.18),bold:true});
  else if(tool==='shape')state.elements.push({id,type:'shape',group:'marks',panelId:front.id,x:10,y:10,w:Math.min(80,maxW),h:Math.min(35,maxH),r:0,fill:'none'});
  else if(tool==='line')state.elements.push({id,type:'line',group:'marks',panelId:front.id,x:10,y:10,w:Math.min(100,maxW),h:0,r:0});
  else if(tool==='mark')state.elements.push({id,type:'icon',icon:'up',group:'marks',panelId:front.id,x:10,y:10,w:Math.min(38,maxW),h:Math.min(38,maxH),r:0});
  else if(tool==='barcode'){
    const old=state.elements.find(e=>e.type==='barcode-qr-group');if(old){state.selectedId=old.id;state.editorTab='Marks';persist();render();return}
    try{const result=addMarkPresetV66(state,'barcodeQr',{panelId:front.id});state=result.state;pushHistory();render();return;}catch(error){alert(error.message);return;}
  } else return;
  state.selectedId=id;state.editorTab=tool==='mark'||tool==='barcode'?'Marks':'Design';pushHistory();render();
}

function applyBatchRow(index){
  const b=state.batch;if(!b?.rows?.length)return;const i=Math.max(0,Math.min(b.rows.length-1,index));
  state.batch.selectedIndex=i;state.variables=normalizeVariables(rowToVariables(b.rows[i],b.columns,b.mapping||autoMapHeaders(b.columns),state.variables));pushHistory();render();
}
async function exportBatchZip(kind){
  const b=state.batch;if(!b?.rows?.length){alert('请先导入 Excel / CSV');return}if(!globalThis.JSZip){alert('JSZip 未加载');return}
  const zip=new globalThis.JSZip();const original=cloneState(state);
  try{
    for(let i=0;i<b.rows.length;i++){
      state.variables=normalizeVariables(rowToVariables(b.rows[i],b.columns,b.mapping||autoMapHeaders(b.columns),original.variables));
      if(kind==='svg'){zip.file(safeBatchFileName(state.variables,i,'svg'),cleanSvg(buildHiddenSvg(),state.exportOptions||{}))}
      else{zip.file(safeBatchFileName(state.variables,i,'pdf'),buildProductionPdf(state))}
    }
    const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
    downloadBytes(`boxstudio-batch-${kind}.zip`,bytes,'application/zip');
  }finally{state=original;persist();render()}
}

function exportBatchCombinedPdf(){
  const b=state.batch;if(!b?.rows?.length){alert('请先导入 Excel / CSV');return}
  const mapping=b.mapping||autoMapHeaders(b.columns),base=cloneState(state),pages=b.rows.map((row)=>{const s=cloneState(base);s.variables=normalizeVariables(rowToVariables(row,b.columns,mapping,base.variables));return s});
  try{downloadBytes('boxstudio-batch-combined.pdf',buildMultiPagePdf(pages),'application/pdf')}
  catch(err){alert('Combined PDF export failed: '+(err?.message||err))}
}

function resetDemo(){if(!confirm('Reset all BoxStudio demo data?'))return;state=cloneState(defaultState);history=[cloneState(state)];historyIndex=0;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render()}

function svgPoint(svg,evt){const pt=svg.createSVGPoint();pt.x=evt.clientX;pt.y=evt.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
function startDrag(evt){
  const svg=document.querySelector('#designSvg'),id=evt.currentTarget.dataset.elementId,el=state.elements.find(e=>e.id===id);if(!svg||!el)return;
  state.selectedId=id;const p=svgPoint(svg,evt),rr=resolveElementRect(el,geo());
  dragging={id,startX:p.x,startY:p.y,origAbsX:rr.absX,origAbsY:rr.absY,currentAbsX:rr.absX,currentAbsY:rr.absY,moved:false,node:evt.currentTarget};
  evt.currentTarget.setPointerCapture?.(evt.pointerId);evt.stopPropagation();evt.preventDefault();
}

function startDielineDrag(evt){
  const svg=document.querySelector('#designSvg'),l=selectedDielineLine();if(!svg||!l)return;const which=Number(evt.currentTarget.dataset.dielineHandle)||1;dielineDragging={which,line:l,moved:false};evt.currentTarget.setPointerCapture?.(evt.pointerId);evt.stopPropagation();evt.preventDefault();
}
function startCurveDrag(evt){
  const svg=document.querySelector('#designSvg'),curve=selectedCurve();if(!svg||!curve)return;curveDragging={handle:evt.currentTarget.dataset.curveHandle,curve,moved:false};evt.currentTarget.setPointerCapture?.(evt.pointerId);evt.stopPropagation();evt.preventDefault();
}
function curveHandleKeys(handle){if(handle==='start')return['x1','y1'];if(handle==='end')return['x2','y2'];if(handle==='c1')return['c1x','c1y'];if(handle==='c2')return['c2x','c2y'];return['cx','cy']}

function dragMove(evt){
  const svg=document.querySelector('#designSvg');
  if(dielineDragging&&svg){const p=svgPoint(svg,evt),l=dielineDragging.line,k=dielineDragging.which===1?['x1','y1']:['x2','y2'];l[k[0]]=Math.max(0,p.x);l[k[1]]=Math.max(0,p.y);dielineDragging.moved=true;const lineNode=document.querySelector('#selectedDielineLine'),handles=document.querySelectorAll('[data-dieline-handle]');if(lineNode){lineNode.setAttribute(k[0],l[k[0]]);lineNode.setAttribute(k[1],l[k[1]])}handles.forEach(h=>{if(Number(h.dataset.dielineHandle)===dielineDragging.which){h.setAttribute('cx',l[k[0]]);h.setAttribute('cy',l[k[1]])}});return}
  if(curveDragging&&svg){const p=svgPoint(svg,evt),c=curveDragging.curve,k=curveHandleKeys(curveDragging.handle);c[k[0]]=Math.max(0,p.x);c[k[1]]=Math.max(0,p.y);curveDragging.moved=true;const path=document.querySelector('#selectedCurvePath');if(path)path.setAttribute('d',curveToPath(c));const h=document.querySelector(`[data-curve-handle="${curveDragging.handle}"]`);if(h){h.setAttribute('cx',c[k[0]]);h.setAttribute('cy',c[k[1]])}return}
  if(!dragging)return;const p=svgPoint(svg,evt),dx=p.x-dragging.startX,dy=p.y-dragging.startY,el=state.elements.find(e=>e.id===dragging.id);if(!el)return;dragging.currentAbsX=dragging.origAbsX+dx;dragging.currentAbsY=dragging.origAbsY+dy;dragging.moved=Math.abs(dx)+Math.abs(dy)>.5;dragging.node.setAttribute('transform',`translate(${dragging.currentAbsX} ${dragging.currentAbsY}) rotate(${el.r||0} ${el.w/2} ${el.h/2})`);
}
function endDrag(){if(dielineDragging){const d=dielineDragging;dielineDragging=null;if(d.moved)pushHistory();else persist();render();return}if(curveDragging){const d=curveDragging;curveDragging=null;if(d.moved)pushHistory();else persist();render();return}if(!dragging)return;const d=dragging;dragging=null;const el=state.elements.find(e=>e.id===d.id);if(el&&d.moved){Object.assign(el,reanchorElementByAbsolute(el,geo(),d.currentAbsX,d.currentAbsY));pushHistory()}else persist();render()}

const SVG_STYLE=`.svg-text{font-family:Arial,Helvetica,sans-serif;fill:#111;white-space:pre}.dieline-cut{fill:none;stroke:#111;stroke-width:2}.dieline-crease{stroke:#c93d3d;stroke-width:2;stroke-dasharray:14 9}.dieline-perf{stroke:#6b4fb3;stroke-width:2;stroke-dasharray:5 5}.dieline-glue{stroke:#2d8a61;stroke-width:2;stroke-dasharray:20 6}.panel-label{font-family:Arial,sans-serif;font-size:16px;fill:#9da4ae}.warning-label{fill:#b42318;font-family:Arial,sans-serif;font-size:10px}`;
function buildHiddenSvg(){const g=geo(),holder=document.createElement('div');holder.innerHTML=`<svg viewBox="0 0 ${g.width} ${g.height}" xmlns="http://www.w3.org/2000/svg"><style>${SVG_STYLE}</style><rect width="100%" height="100%" fill="#fff"/>${dielineSvg(g)}${foldOverlaySvg(g)}${dielineEditSvg(g)}${curveEditSvg()}${elementsSvg(g)}</svg>`;return holder.querySelector('svg')}

window.addEventListener('keydown',e=>{if(state.page==='mark-studio'||document.querySelector('dialog[open]'))return;if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}if(e.key==='Escape'){activeTool='select';render()}});
render();

// External Artwork modules commit through the same state/history as core tools.
window.BoxStudioEditor = {
  getState: () => cloneState(state),
  navigate: (page,tab=null) => {state.page=page;if(tab)state.editorTab=tab;persist();render();},
  commitState: next => {state=cloneState(next);pushHistory();render();window.dispatchEvent(new CustomEvent('boxstudio:statechange'));return cloneState(state);},
  reloadFromStorage: ({history: record=true}={}) => {
    const scroll = [...document.querySelectorAll('.canvas-shell,.rightpanel')].map(node => ({selector: node.classList.contains('rightpanel')?'.rightpanel':'.canvas-shell',x:node.scrollLeft,y:node.scrollTop}));
    state=load();
    if(record)pushHistory();else persist();
    render();
    for(const saved of scroll){const node=document.querySelector(saved.selector);if(node){node.scrollLeft=saved.x;node.scrollTop=saved.y}}
    window.dispatchEvent(new CustomEvent('boxstudio:statechange'));
    return cloneState(state);
  },
  fitCanvas: () => {const shell=document.querySelector('.canvas-shell'),svg=document.querySelector('#designSvg');if(!shell||!svg)return false;const g=geo(),base=fitCssSize(g,100),pad=innerWidth<=760?16:24,ratio=Math.min((shell.clientWidth-pad*2)/base.width,(shell.clientHeight-pad*2)/base.height);state.zoom=Math.max(10,Math.min(800,Math.round(ratio*100)));persist();const size=fitCssSize(g,state.zoom);svg.style.width=size.width+'px';svg.style.height=size.height+'px';const range=document.querySelector('#zoomRange');if(range){range.min='10';range.max='800';range.value=state.zoom}const label=document.querySelector('#zoomLabel');if(label)label.textContent=state.zoom+'%';shell.scrollLeft=0;shell.scrollTop=0;return state.zoom},
  undo,redo,
  getHistory: () => ({canUndo:historyIndex>0,canRedo:historyIndex<history.length-1,index:historyIndex,length:history.length})
};

// Capture before any versioned export handler. Project JSON and structure-only DXF remain available.
document.addEventListener('click',event=>{const button=event.target.closest?.('button');if(!button||state.page!=='editor')return;const id=button.id||'';if(!/exportSvg|exportPng|batchSvg|batchPdf|batchCombinedPdf|Pdf|PDF|Approved|Checked/.test(id))return;try{assertBarcodeProductionV70(state);}catch(error){event.preventDefault();event.stopImmediatePropagation();alert(error.message);}},true);
