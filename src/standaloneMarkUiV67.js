import {mountSymbolLibraryV73} from './symbolLibraryV73.js';
import {HANDLING_SYMBOLS_V72,handlingSymbolV72,handlingSvgV72,handlingParamsV72} from './handlingSymbolsV72.js';
import {CODE_TYPES_V72,codeTypeV72,insertGeneratedCodeV72} from './codeGeneratorV72.js';
import {openCodeGeneratorV72} from './codeGeneratorUiV72.js';
import {resizeStandaloneMarkV69} from './standaloneTransformV69.js';
import {MARK_DOCUMENT_KEY_V67,MARK_TEMPLATES_V67,createMarkDocumentV67,parseMarkDocumentV67,setMarkArtboardV67,insertStandaloneMarkV67,patchStandaloneElementV67,duplicateStandaloneElementV67,validateMarkDocumentV67,markPreflightV67,buildMarkSvgV67,buildMarkPdfV67,visibleMarkElementsV67} from './standaloneMarksV67.js';
import {MARK_FIELDS_V66,applyMarkDataV66} from './shippingMarkLayoutV66.js';
import {V58_MARK_GROUPS,V58_MARK_PRESETS} from './productExperienceV58.js';
import {processArtworkFileV60,createImageElementV60} from './artworkImageV60.js';
import {downloadText,downloadBytes} from './export.js';
import {loadUserTtf,userTtfInfo} from './fontRegistry.js';
import {iconV67} from './uiIconsV67.js';
import {withPngDpiV70} from './pngPrintV70.js';
import {markSelectionV68,markBoundsV68,boundedMarkMoveV68,moveMarkSelectionV68,alignMarkSelectionV68,distributeMarkSelectionV68,lockMarkSelectionV68,deleteMarkSelectionV68,duplicateMarkSelectionV68,reorderMarkSelectionV68} from './standaloneLayoutV68.js';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Array.from(globalThis.crypto.getRandomValues(new Uint32Array(3)),n=>n.toString(36)).join('-')}`;
const clone=x=>structuredClone(x),LIBRARY='boxstudio-standalone-library-v1';
let startupError='';
function load(){try{const raw=localStorage.getItem(MARK_DOCUMENT_KEY_V67);return raw?parseMarkDocumentV67(raw):createMarkDocumentV67();}catch(e){try{localStorage.setItem(MARK_DOCUMENT_KEY_V67+'-recovery',localStorage.getItem(MARK_DOCUMENT_KEY_V67)||'');}catch{}startupError='上次唛头文件无法读取，已保留恢复备份。请通过项目窗口导入有效 JSON。';return createMarkDocumentV67();}}
let doc=load(),history=[clone(doc)],index=0,zoom=1,inspectorTab='data',libraryTab='components',grid=false,host=null,drag=null;
let selectionIds=doc.selectedId?[doc.selectedId]:[],multiSelect=false,snap=false,alignTarget='selection',symbolSearch='',symbolCategory='全部';
const selected=()=>doc.elements.find(e=>e.id===doc.selectedId);
const selection=()=>markSelectionV68(doc,selectionIds);
function normalizeSelection(ids=selectionIds){
 selectionIds=markSelectionV68(doc,ids).map(e=>e.id);
 doc.selectedId=selectionIds.includes(doc.selectedId)?doc.selectedId:selectionIds.at(-1)||'';
}
const button=(attr,label,icon,extra='')=>`<button ${attr} ${extra}>${icon?iconV67(icon):''}<span>${label}</span></button>`;
function toast(message){const el=document.querySelector('[data-v67-toast]');if(!el)return;el.textContent=message;el.dataset.show='true';clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.dataset.show='false';},4000);}
function store(){doc.savedAt=new Date().toISOString();localStorage.setItem(MARK_DOCUMENT_KEY_V67,JSON.stringify(doc));}
function commit(next,{selection:ids}={}){
 validateMarkDocumentV67(next);
 if(JSON.stringify(next)===JSON.stringify(doc)){render();return clone(doc);}
 const previous=doc,previousIds=selectionIds;
 doc=clone(next);normalizeSelection(ids??(next.projectId!==previous.projectId||next.selectedId!==previous.selectedId?[next.selectedId]:selectionIds));
 try{store();}catch(e){doc=previous;selectionIds=previousIds;render();throw new Error('本地空间不足，未保存这次修改。请下载项目 JSON 后减少图片。');}
 history=history.slice(0,index+1);history.push(clone(doc));index++;render();return clone(doc);
}
function safely(fn){try{return fn();}catch(error){toast(error.message);const err=host?.querySelector('[data-mark-error]');if(err)err.textContent=error.message;return null;}}
function historyStep(delta){const next=index+delta;if(next<0||next>=history.length)return;cancelDrag();const previous=doc,previousIds=selectionIds;doc=clone(history[next]);normalizeSelection(markSelectionV68(doc,selectionIds).length?selectionIds:[doc.selectedId]);try{store();index=next;render();}catch(e){doc=previous;selectionIds=previousIds;render();toast('无法保存撤销结果，请先下载备份。');}}
function getLibrary(){const values=JSON.parse(localStorage.getItem(LIBRARY)||'{}');if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('唛头项目索引无效。');return values;}
function saveProject(copy=false){const items=getLibrary(),next=clone(doc);if(copy)next.projectId=`mark-${uid()}`;next.savedAt=new Date().toISOString();items[next.projectId]=next;localStorage.setItem(LIBRARY,JSON.stringify(items));if(copy)commit(next);toast('唛头项目已保存');return next;}
function preserve(){saveProject();}
function closeDialog(dialog){dialog.boxstudioRestore?.();dialog.boxstudioRestore=null;dialog.close();dialog.remove();}
function dialogShell(title,content){const d=document.createElement('dialog');d.className='v67-dialog';d.innerHTML=`<header><div><span class="v67-eyebrow">SHIPPING MARK STUDIO</span><h2>${title}</h2></div>${button('data-close','', 'close','aria-label="关闭窗口"')}</header>${content}`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>closeDialog(d);d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);});d.showModal();return d;}
function openProjects(){
 const items=safely(getLibrary);if(!items)return;
 const d=dialogShell('我的唛头项目',`<form data-rename><label>项目名称<input name="projectName" value="${esc(doc.projectName)}" maxlength="160" required></label><button type="submit">重命名</button></form><div class="v67-dialog-actions">${button('data-save','保存项目','save')}${button('data-copy','另存副本','copy')}${button('data-json','下载 JSON','download')}${button('data-import','打开 JSON','folder')}<input type="file" data-file accept=".json,application/json" hidden></div><p role="status" data-result>自动保存在当前浏览器。下载 JSON 可备份或在其他电脑继续编辑。</p><section class="v67-project-list">${Object.values(items).length?Object.values(items).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt))).map(x=>`<article><div>${iconV67('label')}<span><b>${esc(x.projectName)}</b><small>${x.artboard.width} × ${x.artboard.height} mm · ${x.elements.length} 个对象</small></span></div><button data-open="${esc(x.projectId)}">打开</button></article>`).join(''):'<div class="v67-empty">'+iconV67('folder',32)+'<b>保存第一个唛头项目</b><p>模板、变量和排版会一起保留。</p></div>'}</section>`);
 d.dataset.v67MarkProjects='true';
 const fail=e=>d.querySelector('[data-result]').textContent=e.message;
 d.querySelector('[data-rename]').onsubmit=e=>{e.preventDefault();try{const next=clone(doc);next.projectName=new FormData(e.target).get('projectName').trim();if(!next.projectName)throw new Error('请填写项目名称。');commit(next);d.querySelector('[data-result]').textContent='名称已更新。';}catch(e){fail(e);}};
 for(const [attr,copy]of[['data-save',false],['data-copy',true]])d.querySelector(`[${attr}]`).onclick=()=>{try{saveProject(copy);closeDialog(d);openProjects();}catch(e){fail(e);}};
 d.querySelector('[data-json]').onclick=()=>downloadText('boxstudio-mark.json',JSON.stringify(doc,null,2),'application/json');
 d.querySelector('[data-import]').onclick=()=>d.querySelector('[data-file]').click();
 d.querySelector('[data-file]').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>8*1024*1024)throw new Error('唛头项目文件不能超过 8 MB。');const next=parseMarkDocumentV67(await file.text());preserve();commit(next);fit();closeDialog(d);toast('独立唛头项目已打开');}catch(e){fail(e);}};
 d.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{try{const next=parseMarkDocumentV67(JSON.stringify(items[b.dataset.open]));preserve();commit(next);fit();closeDialog(d);}catch(e){fail(e);}});
}
async function exportPng(dpi){if(dpi<300&&doc.elements.some(e=>e.type==='barcode-qr-group'&&!e.hidden))throw new Error('含条码 / QR 的 PNG 至少需要 300 DPI。');const w=Math.round(doc.artboard.width/25.4*dpi),h=Math.round(doc.artboard.height/25.4*dpi);if(w*h>40e6)throw new Error('此尺寸的 PNG 超过 4000 万像素，请使用 300 DPI 或矢量 SVG。');const url=URL.createObjectURL(new Blob([buildMarkSvgV67(doc)],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('PNG 生成失败。');downloadBytes(`boxstudio-mark-${dpi}dpi.png`,withPngDpiV70(new Uint8Array(await blob.arrayBuffer()),dpi),'image/png');return{width:w,height:h};}finally{URL.revokeObjectURL(url);}}
function openExport(){
 const p=markPreflightV67(doc),d=dialogShell('导出唛头',`<div class="v67-export-meta"><b>${doc.artboard.width} × ${doc.artboard.height} mm</b><span>${visibleMarkElementsV67(doc).length} 个可见对象</span></div><div class="v67-export-options">${button('data-export="pdf"','PDF · 1:1 印刷','file')}${button('data-export="svg"','SVG · 矢量编辑','dieline')}${button('data-export="png"','PNG · 高清图片','image')}${button('data-export="json"','JSON · 项目备份','folder')}</div><label class="v67-dpi">PNG 分辨率<select data-dpi><option>300</option><option>600</option></select><span>DPI</span></label><details><summary>中文 PDF 字体</summary><p>加载含所需字符的 TTF 字体后，PDF 文字将转为矢量轮廓。字体仅在本次浏览器会话使用。</p><input data-font type="file" accept=".ttf"><small data-font-name>${esc(userTtfInfo()?.name||'未加载 TTF 字体')}</small></details><section class="v67-preflight ${p.ok?'ok':'error'}"><b>${p.ok?'检查通过，可导出':'请先修正以下问题'}</b>${[...p.errors,...p.warnings].map(x=>`<p>${esc(x.message)}</p>`).join('')||'<p>固定组合规格、留白、遮挡及编码检查通过。PDF 会继续校验实际导出稿的条码和 QR。</p>'}</section><p role="status" data-result></p>`);
 d.dataset.v67Export='true';
 d.querySelector('[data-font]').onchange=async e=>{try{const file=e.target.files[0];if(file.size>20*1024*1024)throw new Error('字体不能超过 20 MB。');loadUserTtf(await file.arrayBuffer(),file.name);d.querySelector('[data-font-name]').textContent=file.name;d.querySelector('[data-result]').textContent='字体已加载。';}catch(e){d.querySelector('[data-result]').textContent=e.message;}};
 d.querySelectorAll('[data-export]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const type=b.dataset.export;if(type!=='json'){const report=markPreflightV67(doc,{pdf:type==='pdf'});if(!report.ok)throw new Error(report.errors.map(x=>x.message).join('\n'));}if(type==='pdf')downloadBytes('boxstudio-mark-1to1.pdf',buildMarkPdfV67(doc),'application/pdf');if(type==='svg')downloadText('boxstudio-mark.svg',buildMarkSvgV67(doc),'image/svg+xml');if(type==='json')downloadText('boxstudio-mark.json',JSON.stringify(doc,null,2),'application/json');if(type==='png')await exportPng(Number(d.querySelector('[data-dpi]').value));d.querySelector('[data-result]').textContent='文件已生成并下载。';}catch(e){d.querySelector('[data-result]').textContent=e.message;}finally{b.disabled=false;}});
}
function fieldsHtml(){return MARK_FIELDS_V66.map(([key,label])=>{const units=key==='weightUnit'?['KG','LBS']:key==='dimensionUnit'?['MM','CM','INCH']:null;return`<label>${label}${units?`<select name="${key}">${units.map(v=>`<option ${v===doc.variables[key]?'selected':''}>${v}</option>`).join('')}</select>`:`<input name="${key}" value="${esc(doc.variables[key])}" ${['nw','gw','length','width','height','packageIndex','packageCount'].includes(key)?'inputmode="decimal"':''}>`}</label>`;}).join('');}
function selectionActionsHtml(list){
 const locked=list.some(e=>e.locked),allLocked=list.every(e=>e.locked);
 return `<div class="v67-object-actions">${button('data-object="duplicate"','复制','copy')}${button('data-object="delete"','删除','trash',locked?'disabled':'')}${button('data-object="lock"',allLocked?'解锁':'锁定',allLocked?'unlock':'lock')}</div>`;
}
function layoutHtml(list){
 const blocked=list.some(e=>e.locked),target=list.length>1?alignTarget:'safe';
 const directions=[['left','左对齐','alignLeft'],['center','水平居中','alignCenter'],['right','右对齐','alignRight'],['top','顶对齐','alignTop'],['middle','垂直居中','alignMiddle'],['bottom','底对齐','alignBottom']];
 return `<section class="v68-layout" aria-label="对齐与分布"><div class="v67-section-head"><b>对齐与分布</b><small>${list.length} 个对象</small></div><label>对齐范围<select data-mark-align-target><option value="selection" ${target==='selection'?'selected':''} ${list.length<2?'disabled':''}>所选对象范围</option><option value="safe" ${target==='safe'?'selected':''}>画布安全区 · 8 mm</option></select></label><div class="v68-align-buttons" role="group" aria-label="对齐操作">${directions.map(([direction,label,icon])=>button(`data-mark-align="${direction}"`,'',icon,`aria-label="${label}" title="${label}" ${blocked?'disabled':''}`)).join('')}</div><div class="v68-distribute-buttons">${button('data-mark-distribute="x"','水平等间距','distributeX',blocked||list.length<3?'disabled':'')}${button('data-mark-distribute="y"','垂直等间距','distributeY',blocked||list.length<3?'disabled':'')}</div><small>等间距分布保留两端对象，至少需要 3 个对象。</small><label class="v67-check v68-snap"><input data-mark-snap type="checkbox" ${snap?'checked':''}>拖动时吸附 10 mm 网格</label>${blocked?'<p class="v68-locked-note">所选对象包含锁定图层，解锁后可修改排版。绑定的运输数据仍会同步。</p>':''}</section>`;
}
function selectionPropertiesHtml(list){
 const b=markBoundsV68(list),locked=list.filter(e=>e.locked).length;
 return `<section class="v68-selection-summary"><div class="v67-section-head"><b>已选择 ${list.length} 个对象</b><small>${locked?`${locked} 个已锁定`:'整体排版'}</small></div><dl><div><dt>X / Y</dt><dd>${b.x.toFixed(1)} / ${b.y.toFixed(1)} mm</dd></div><div><dt>整体宽 / 高</dt><dd>${b.w.toFixed(1)} / ${b.h.toFixed(1)} mm</dd></div></dl><p>拖动任一选中对象可整体移动；空白处拖动可框选。</p></section><form data-mark-move><fieldset ${locked?'disabled':''}><div class="v67-fields"><label>水平移动 · mm<input name="dx" type="number" value="0" step="0.5" required></label><label>垂直移动 · mm<input name="dy" type="number" value="0" step="0.5" required></label></div><button type="submit">移动所选对象</button></fieldset></form>${selectionActionsHtml(list)}${layoutHtml(list)}`;
}
function symbolFieldsV72(e){if(e.type!=='icon')return'';const p=handlingParamsV72(e),labels={stackLimit:'堆码层数上限 · 含底箱',stackHeight:'最大堆码高度 · m',stackWeight:'上部堆码重量上限 · kg',temperatureMin:'最低温度 · °C',temperatureMax:'最高温度 · °C'};return`<div class="v72-symbol-fields">${Object.entries(p).map(([key,value])=>`<label>${labels[key]}<input name="${key}" type="number" step="${key==='stackHeight'?.1:1}" value="${value}" required></label>`).join('')}</div>${Object.keys(p).length?'<p class="v72-symbol-note">填写实际确认的储运限制。图形中的数值会同步到 SVG、PDF 和 3D。</p>':''}`;}
function codeFieldsV72(e){return e.type!=='generated-code'?'':`<label>编码类型<select name="codeType">${CODE_TYPES_V72.map(t=>`<option value="${t.id}" ${t.id===e.codeType?'selected':''}>${t.label}</option>`).join('')}</select></label><label>编码内容<textarea name="codeValue" rows="4" maxlength="2048">${esc(e.codeValue)}</textarea></label><label class="v67-check"><input name="codeShowText" type="checkbox" ${e.codeShowText!==false?'checked':''}>显示条码下方文字</label><p class="v72-symbol-note">可直接修改内容。模块和静区随尺寸重算，过密的编码不能应用。</p>`;}
function propertiesHtml(){const e=selected(),list=selection();if(list.length>1)return selectionPropertiesHtml(list);if(!e)return`<div class="v67-empty">${iconV67('select',32)}<b>选择一个对象</b><p>在画布或图层中选择后，调整位置、尺寸和内容。</p></div>`;return`<form data-mark-properties><fieldset ${e.locked?'disabled':''}><div class="v67-section-head"><b>${esc(e.type==='barcode-qr-group'?'条码 + QR 组合':e.type==='text'?'变量文字':e.type==='icon'?handlingSymbolV72(e.icon).label:e.type==='generated-code'?codeTypeV72(e.codeType).label:e.type==='notice'?'多包裹提示':e.type==='image'?'图片':'矩形')}</b><small>单位 mm · 拖动角点调整尺寸</small></div><div class="v67-fields">${['x','y','w','h'].map((k,i)=>`<label>${['X','Y','宽度','高度'][i]}<input name="${k}" type="number" step="0.5" value="${e[k]}" ${i>1?(e.type==='barcode-qr-group'?'readonly':'min="4"'):''}></label>`).join('')}</div>${e.type==='barcode-qr-group'?`<p class="v67-lock-note">禁止拆分 · 条码与二维码整体等比例缩放</p><label>整体规格<select name="preset" data-barcode-size><option value="250x80" ${e.w===250?'selected':''}>25 × 8 cm · 优先规格</option><option value="200x64" ${e.w===200?'selected':''}>20 × 6.4 cm · 空间不足时</option></select></label><label>条码类型<select name="barcodeType">${['CODE39','EAN13','UPCA','ITF14','GS1_128'].map(t=>`<option ${t===e.barcodeType?'selected':''}>${t}</option>`).join('')}</select></label><label>条码内容<input name="barcodeValue" value="${esc(e.barcodeValue)}"></label><label>QR 内容<input name="qrValue" value="${esc(e.qrValue)}"></label>`:''}${symbolFieldsV72(e)}${codeFieldsV72(e)}${['text','notice'].includes(e.type)?`<label>文字内容<textarea name="template" rows="4">${esc(e.template)}</textarea></label><div class="v67-fields"><label>字号 · mm<input name="fontSize" type="number" min="1" max="80" step="0.5" value="${e.fontSize}"></label><label class="v67-check"><input name="bold" type="checkbox" ${e.bold?'checked':''}>加粗</label></div><small>使用 {{sku}}、{{crn}} 等变量绑定运输数据。</small>`:''}<p role="alert" data-property-error></p><button class="primary" type="submit">应用对象属性</button></fieldset></form>${selectionActionsHtml(list)}${layoutHtml(list)}`;}
function renderInspector(){if(!host)return;const right=host.querySelector('[data-mark-inspector]');right.innerHTML=`<div class="v67-inspector-tabs" role="tablist" aria-label="唛头检查器"><button role="tab" data-inspector="data" aria-selected="${inspectorTab==='data'}">唛头数据</button><button role="tab" data-inspector="object" aria-selected="${inspectorTab==='object'}">对象属性</button></div><div class="v67-inspector-content">${inspectorTab==='data'?`<div class="v67-section-head"><b>运输与包装信息</b><small>所有绑定位置同步更新</small></div><form data-mark-data><div class="v67-fields">${fieldsHtml()}</div><p role="alert" data-data-error></p><button type="submit" class="primary">应用唛头数据</button></form>`:propertiesHtml()}<details class="v67-artboard-options"><summary>画布尺寸</summary><form data-artboard><div class="v67-fields"><label>宽度 · mm<input name="width" type="number" min="40" max="1500" value="${doc.artboard.width}" required></label><label>高度 · mm<input name="height" type="number" min="30" max="1500" value="${doc.artboard.height}" required></label></div><button type="submit">应用画布尺寸</button><p role="alert" data-size-error></p></form></details><p role="alert" data-mark-error>${esc(startupError)}</p></div>`;
 right.querySelectorAll('[data-inspector]').forEach(b=>b.onclick=()=>{inspectorTab=b.dataset.inspector;renderInspector();});
 const data=right.querySelector('[data-mark-data]');if(data)data.onsubmit=e=>{e.preventDefault();try{commit(applyMarkDataV66(doc,Object.fromEntries(new FormData(data)),{syncDimensions:false}));toast('唛头数据已同步');}catch(e){data.querySelector('[data-data-error]').textContent=e.message;}};
 const props=right.querySelector('[data-mark-properties]');if(props)props.onsubmit=e=>{e.preventDefault();try{const patch=Object.fromEntries(new FormData(props));if(selected().type==='barcode-qr-group'){delete patch.w;delete patch.h;}if(selected().type==='generated-code')patch.codeShowText=props.elements.codeShowText.checked;if(['text','notice'].includes(selected().type))patch.bold=props.elements.bold.checked;commit(patchStandaloneElementV67(doc,doc.selectedId,patch));toast('对象属性已更新');}catch(e){props.querySelector('[data-property-error]').textContent=e.message;}};
 right.querySelectorAll('[data-object]').forEach(b=>b.onclick=()=>objectAction(b.dataset.object));
 const move=right.querySelector('[data-mark-move]');if(move)move.onsubmit=e=>{e.preventDefault();safely(()=>{const f=new FormData(move);commit(moveMarkSelectionV68(doc,selectionIds,Number(f.get('dx')),Number(f.get('dy'))));toast('所选对象已整体移动');});};
 right.querySelector('[data-mark-align-target]')?.addEventListener('change',e=>{alignTarget=e.target.value;});
 right.querySelectorAll('[data-mark-align]').forEach(b=>b.onclick=()=>safely(()=>{commit(alignMarkSelectionV68(doc,selectionIds,b.dataset.markAlign,{target:right.querySelector('[data-mark-align-target]').value}));toast('对象已对齐');}));
 right.querySelectorAll('[data-mark-distribute]').forEach(b=>b.onclick=()=>safely(()=>{commit(distributeMarkSelectionV68(doc,selectionIds,b.dataset.markDistribute));toast('对象已等间距分布');}));
 right.querySelector('[data-mark-snap]')?.addEventListener('change',e=>{snap=e.target.checked;host.querySelector('[data-mark-grid]').checked=grid=snap||grid;renderBoard();});
 right.querySelector('[data-artboard]').onsubmit=e=>{e.preventDefault();try{const f=new FormData(e.target);commit(setMarkArtboardV67(doc,f.get('width'),f.get('height')));fit();}catch(error){right.querySelector('[data-size-error]').textContent=error.message;}};
}
function objectLabel(e){return e.type==='text'?e.template.split('\n')[0].replace(/{{(\w+)}}/g,'$1'):e.type==='barcode-qr-group'?'条码 + QR':e.type==='notice'?'多包裹提示':e.type==='generated-code'?codeTypeV72(e.codeType)?.label:e.type==='icon'?handlingSymbolV72(e.icon)?.label:e.type==='image'?e.name:'矩形';}
function renderLibrary(){
 if(!host)return;
 const left=host.querySelector('[data-mark-library]')||document.querySelector('[data-mark-library]');if(!left)return;
 let content='';
 if(libraryTab==='templates')content=MARK_TEMPLATES_V67.map(t=>`<button class="v67-template" data-mark-template="${t.id}">${iconV67(t.id==='blank'?'file':'label',30)}<span><b>${t.label}</b><small>${t.hint}</small></span>${iconV67('arrow',16)}</button>`).join('');
 else if(libraryTab==='layers'){
  content='<p class="v67-layer-hint">上方图层显示在下方图层之上。</p>'+[...doc.elements].reverse().map(e=>`<div class="v67-layer ${selectionIds.includes(e.id)?'active':''}"><button data-layer="${esc(e.id)}" aria-pressed="${selectionIds.includes(e.id)}">${iconV67(e.type==='barcode-qr-group'?'barcode':e.type==='image'?'image':e.type==='icon'?'mark':'text',16)}<span>${esc(objectLabel(e))}</span></button><button data-hide="${esc(e.id)}" aria-label="${e.hidden?'显示':'隐藏'} ${esc(objectLabel(e))}" aria-pressed="${Boolean(e.hidden)}">${iconV67(e.hidden?'eyeOff':'eye',16)}</button><button data-layer-lock="${esc(e.id)}" aria-label="${e.locked?'解锁':'锁定'} ${esc(objectLabel(e))}" aria-pressed="${Boolean(e.locked)}">${iconV67(e.locked?'lock':'unlock',16)}</button></div>`).join('');
  content+=doc.elements.length?`<div class="v67-layer-actions">${button('data-object="up"','上移','arrow',!selection().length||selection().some(e=>e.locked)?'disabled':'')}${button('data-object="down"','下移','arrow',!selection().length||selection().some(e=>e.locked)?'disabled':'')}</div>`:'<p class="v67-empty">画布尚无对象。</p>';
 }else if(libraryTab==='symbols')content='<div data-v73-symbol-library></div>';else content=`<button class="v72-open-codes" data-v72-generator>${iconV67('barcode',24)}<span>条码 / 二维码生成器</span></button>`+V58_MARK_GROUPS.map(g=>`<section class="v67-components"><h3>${g.label}</h3><div>${g.items.map(id=>`<button data-mark-insert="${id}" draggable="true">${V58_MARK_PRESETS[id].kind==='icon'?`<svg viewBox="0 0 40 40" width="24" height="24" aria-hidden="true">${handlingSvgV72({icon:id,w:40,h:40})}</svg>`:iconV67(id==='barcodeQr'?'barcode':id==='variable'?'var':'text',22)}<span>${V58_MARK_PRESETS[id].label}</span></button>`).join('')}</div></section>`).join('')+`<section class="v67-components"><h3>自由设计</h3><div>${button('data-mark-custom="text"','自定义文字','text')}${button('data-mark-custom="shape"','矩形边框','shape')}${button('data-mark-image','Logo / 图片','image')}</div></section>`;
 left.innerHTML=`<div class="v67-library-head"><span class="v67-eyebrow">MARK LIBRARY</span><h2>设计你的唛头</h2><p>从组件开始，或使用现成模板。</p></div><div class="v67-library-tabs" role="tablist" aria-label="唛头素材"><button role="tab" data-library-tab="components" aria-selected="${libraryTab==='components'}">组件</button><button role="tab" data-library-tab="templates" aria-selected="${libraryTab==='templates'}">模板</button><button role="tab" data-library-tab="symbols" aria-selected="${libraryTab==='symbols'}">标识</button><button role="tab" data-library-tab="layers" aria-selected="${libraryTab==='layers'}">图层</button></div><div class="v67-library-content">${content}</div>`;
 left.querySelector('[data-v72-generator]')?.addEventListener('click',()=>openCodeGeneratorV72({variables:clone(doc.variables),onInsert:config=>{inspectorTab='object';commit(insertGeneratedCodeV72(doc,config));toast('编码已插入，可继续修改内容。');}}));
 if(libraryTab==='symbols')mountSymbolLibraryV73(left.querySelector('[data-v73-symbol-library]'),{search:symbolSearch,category:symbolCategory,onFilter:f=>{symbolSearch=f.search;symbolCategory=f.category;},onInsert:(id,params)=>insert(id,null,params)});
 left.querySelectorAll('[data-library-tab]').forEach(b=>b.onclick=()=>{libraryTab=b.dataset.libraryTab;renderLibrary();});left.querySelectorAll('[data-mark-insert]').forEach(b=>{b.onclick=()=>insert(b.dataset.markInsert);b.ondragstart=e=>e.dataTransfer.setData('application/boxstudio-mark',b.dataset.markInsert);});
 left.querySelectorAll('[data-mark-template]').forEach(b=>b.onclick=()=>safely(()=>{preserve();commit(createMarkDocumentV67(b.dataset.markTemplate));fit();toast('已创建新唛头，原项目已保存');}));
 left.querySelectorAll('[data-layer]').forEach(b=>b.onclick=e=>select(b.dataset.layer,{additive:e.shiftKey||e.ctrlKey||e.metaKey||multiSelect}));left.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>safely(()=>{const next=clone(doc),e=next.elements.find(e=>e.id===b.dataset.hide);e.hidden=!e.hidden;commit(next);}));
 left.querySelectorAll('[data-layer-lock]').forEach(b=>b.onclick=()=>safely(()=>{const e=doc.elements.find(x=>x.id===b.dataset.layerLock);commit(lockMarkSelectionV68(doc,[e.id],!e.locked));toast(e.locked?'图层已解锁':'图层已锁定');}));
 left.querySelectorAll('[data-object]').forEach(b=>b.onclick=()=>objectAction(b.dataset.object));left.querySelector('[data-mark-image]')?.addEventListener('click',()=>host.querySelector('[data-mark-image-file]').click());left.querySelectorAll('[data-mark-custom]').forEach(b=>b.onclick=()=>safely(()=>{let next;if(b.dataset.markCustom==='text'){next=insertStandaloneMarkV67(doc,'variable');next.elements.find(e=>e.id===next.selectedId).template='Your text';}else{next=clone(doc);const e={id:`shape-${uid()}`,type:'shape',group:'marks',panelId:'label',x:16,y:16,w:80,h:40,r:0};next.elements.push(e);next.selectedId=e.id;}inspectorTab='object';commit(next);}));
}
function insert(id,point,params){safely(()=>{let next=insertStandaloneMarkV67(doc,id);const e=next.elements.find(e=>e.id===next.selectedId);if(params)Object.assign(e,params);if(id==='dimensions')e.template=e.template.replaceAll('×','x');if(point){e.x=Math.max(0,Math.min(doc.artboard.width-e.w,point.x));e.y=Math.max(0,Math.min(doc.artboard.height-e.h,point.y));}inspectorTab='object';commit(next);toast('已添加唛头组件');});}
function select(id,{additive=false}={}){
 cancelDrag();
 const ids=additive?(selectionIds.includes(id)?selectionIds.filter(x=>x!==id):[...selectionIds,id]):id?[id]:[];
 doc.selectedId=id;normalizeSelection(ids);inspectorTab='object';render();
}
function objectAction(action){safely(()=>{
 const list=selection();if(!list.length)throw new Error('请先选择一个对象。');
 if(action==='duplicate'){const result=duplicateMarkSelectionV68(doc,selectionIds);commit(result.state,{selection:result.ids});}
 else if(action==='delete')commit(deleteMarkSelectionV68(doc,selectionIds),{selection:[]});
 else if(action==='lock')commit(lockMarkSelectionV68(doc,selectionIds,!list.every(e=>e.locked)));
 else if(action==='center'){const b=markBoundsV68(list);commit(moveMarkSelectionV68(doc,selectionIds,(doc.artboard.width-b.w)/2-b.x,0));}
 else if(action==='up'||action==='down')commit(reorderMarkSelectionV68(doc,selectionIds,action));
 });}

function renderToolbar(){if(!host)return;host.querySelector('[data-mark-undo]').disabled=index<=0;host.querySelector('[data-mark-redo]').disabled=index>=history.length-1;const list=selection(),locked=list.some(e=>e.locked);host.querySelector('[data-mark-copy]').disabled=!list.length;host.querySelector('[data-mark-delete]').disabled=!list.length||locked;host.querySelector('[data-mark-multiselect]').setAttribute('aria-pressed',String(multiSelect));host.querySelector('[data-mark-selection-count]').textContent=list.length?`已选 ${list.length} 个对象${locked?' · 已锁定':''}`:'独立唛头画布';host.querySelector('[data-mark-size]').textContent=`${doc.artboard.width} × ${doc.artboard.height} mm`;host.querySelector('[data-mark-zoom-label]').textContent=`${Math.round(zoom*100)}%`;const p=markPreflightV67(doc);const n=host.querySelector('[data-mark-preflight]');n.textContent=p.errors.length?`${p.errors.length} 项待修正`:p.warnings.length?`${p.warnings.length} 项提示`:'检查通过';n.className=p.errors.length?'error':p.warnings.length?'warn':'ok';const title=document.querySelector('[data-v66-project-title]');if(title&&title.textContent!==doc.projectName)title.textContent=doc.projectName;const saved=document.querySelector('.save-state');if(saved&&saved.textContent!=='已自动保存')saved.textContent='已自动保存';}
function renderBoard(document=doc){if(!host)return;const board=host.querySelector('[data-mark-board]');board.innerHTML=buildMarkSvgV67(document,{ui:true,grid,selectedIds:selectionIds,resizeHandles:true,handleSize:(matchMedia('(pointer:coarse)').matches?24:14)/(96/25.4*zoom)});const svg=board.querySelector('svg');svg.style.width=`${doc.artboard.width*96/25.4*zoom}px`;svg.style.height=`${doc.artboard.height*96/25.4*zoom}px`;}
function fit(){if(!host)return;const stage=host.querySelector('[data-mark-stage]'),r=stage.getBoundingClientRect();zoom=Math.max(.12,Math.min(2,Math.min((r.width-72)/(doc.artboard.width*96/25.4),(r.height-72)/(doc.artboard.height*96/25.4))));renderBoard();renderToolbar();}
function render(){normalizeSelection();if(!host||!host.isConnected)return;renderBoard();renderInspector();renderLibrary();renderToolbar();}
function releasePointer(stage,id){if(stage?.hasPointerCapture(id))stage.releasePointerCapture(id);}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;const stage=host?.querySelector('[data-mark-stage]');releasePointer(stage,d.pointerId);stage?.classList.remove('is-dragging');renderBoard();}
function marqueeBounds(d){const x=Math.min(d.start.x,d.current.x),y=Math.min(d.start.y,d.current.y);return{x,y,w:Math.abs(d.current.x-d.start.x),h:Math.abs(d.current.y-d.start.y)};}
function point(event){const r=host.querySelector('[data-mark-board] svg').getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*doc.artboard.width,y:(event.clientY-r.top)/r.height*doc.artboard.height};}
function mount(page){cancelDrag();host=page;page.innerHTML=`<div class="v67-mark-workspace"><aside class="v67-library" data-mark-library></aside><section class="v67-mark-main"><div class="v67-canvas-toolbar"><button data-mark-mobile-library aria-label="打开唛头组件" title="打开唛头组件">${iconV67('layers')}<span>组件</span></button><div class="v67-tool-group">${button('data-mark-undo','', 'undo','aria-label="撤销"')}${button('data-mark-redo','', 'redo','aria-label="重做"')}</div><span class="v67-divider"></span><div class="v67-tool-group">${button('data-mark-copy','', 'copy','aria-label="复制所选对象"')}${button('data-mark-delete','', 'trash','aria-label="删除所选对象"')}${button('data-mark-multiselect','', 'multi','aria-label="多选模式" title="多选模式：点击对象添加或移除选择" aria-pressed="false"')}</div><span class="spacer"></span><span data-mark-size class="v67-size-chip"></span>${button('data-mark-fit','适合窗口','fit')}</div><div class="v67-mark-stage" data-mark-stage tabindex="0" aria-label="唛头设计画布"><div class="v67-mark-board" data-mark-board></div></div><footer class="v67-mark-status"><span><i></i><span data-mark-selection-count aria-live="polite">独立唛头画布</span></span><button data-mark-preflight></button><span class="spacer"></span><label><input data-mark-grid type="checkbox">网格</label><button data-mark-zoom="-1" aria-label="缩小">−</button><span data-mark-zoom-label></span><button data-mark-zoom="1" aria-label="放大">+</button></footer></section><aside class="v67-mark-inspector" data-mark-inspector></aside></div><input data-mark-image-file type="file" accept="image/png,image/jpeg,image/webp" hidden>`;
 page.querySelector('[data-mark-undo]').onclick=()=>historyStep(-1);page.querySelector('[data-mark-redo]').onclick=()=>historyStep(1);page.querySelector('[data-mark-copy]').onclick=()=>objectAction('duplicate');page.querySelector('[data-mark-delete]').onclick=()=>objectAction('delete');page.querySelector('[data-mark-multiselect]').onclick=()=>{multiSelect=!multiSelect;renderToolbar();toast(multiSelect?'多选模式：点击对象添加或移除选择':'已切换为单选模式');};page.querySelector('[data-mark-fit]').onclick=fit;page.querySelector('[data-mark-grid]').onchange=e=>{grid=e.target.checked;renderBoard();};page.querySelectorAll('[data-mark-zoom]').forEach(b=>b.onclick=()=>{zoom=Math.min(3,Math.max(.12,zoom+Number(b.dataset.markZoom)*.1));renderBoard();renderToolbar();});page.querySelector('[data-mark-preflight]').onclick=openExport;
 page.querySelector('[data-mark-mobile-library]').onclick=()=>{const library=page.querySelector('[data-mark-library]'),placeholder=document.createComment('library'),d=dialogShell('唛头组件','');library.before(placeholder);d.append(library);const restore=()=>{placeholder.replaceWith(library);};d.boxstudioRestore=restore;d.addEventListener('close',()=>{d.boxstudioRestore?.();d.boxstudioRestore=null;},{once:true});};
 const stage=page.querySelector('[data-mark-stage]');stage.ondragover=e=>e.preventDefault();stage.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('application/boxstudio-mark');if(id)insert(id,point(e));};
 stage.onpointerdown=e=>{
  if(e.button!==0||drag)return;
  const handle=e.target.closest('[data-mark-resize]'),g=e.target.closest('[data-mark-object]'),additive=e.shiftKey||e.ctrlKey||e.metaKey||multiSelect;
  stage.focus({preventScroll:true});
  if(handle&&g){
   e.preventDefault();const id=g.dataset.markObject;
   if(selectionIds.length!==1||selectionIds[0]!==id||selected()?.locked)return;
   drag={kind:'resize',pointerId:e.pointerId,start:point(e),id,corner:handle.dataset.markResize,original:clone(doc),candidate:null,moved:false};
  }else if(!g){
   if(!e.target.closest('[data-mark-board] svg')){if(!additive)select('');return;}
   e.preventDefault();const start=point(e);
   drag={kind:'marquee',start,current:start,pointerId:e.pointerId,originalIds:[...selectionIds],additive,moved:false};
  }else{
   e.preventDefault();const id=g.dataset.markObject,wasSelected=selectionIds.includes(id);
   if(!wasSelected){doc.selectedId=id;normalizeSelection(additive?[...selectionIds,id]:[id]);}
   inspectorTab='object';render();
   const list=selection();if(list.some(x=>x.locked)){if(wasSelected&&additive)select(id,{additive:true});else toast('所选图层已锁定，请先解锁后移动');return;}
   drag={kind:'move',start:point(e),pointerId:e.pointerId,ids:[...selectionIds],origins:list.map(x=>({id:x.id,x:x.x,y:x.y})),moved:false,pendingToggle:wasSelected&&additive?id:'',pendingCollapse:wasSelected&&!additive&&list.length>1?id:'',dx:0,dy:0};
  }
  if(e.isTrusted)stage.setPointerCapture(e.pointerId);
 };
 stage.onpointermove=e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;
  const p=point(e);
  if(drag.kind==='resize'){
   try{drag.candidate=resizeStandaloneMarkV69(drag.original,drag.id,drag.corner,p.x-drag.start.x,p.y-drag.start.y,{preserveAspect:e.shiftKey});drag.moved=JSON.stringify(drag.candidate.elements)!==JSON.stringify(doc.elements);renderBoard(drag.candidate);}catch(error){cancelDrag();toast(error.message);return;}
  }else if(drag.kind==='marquee'){
   drag.current=p;drag.moved=Math.abs(p.x-drag.start.x)+Math.abs(p.y-drag.start.y)>.5;
   const r=marqueeBounds(drag),svg=host.querySelector('[data-mark-board] svg');
   let rect=svg.querySelector('.v68-marquee');if(!rect){rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('class','ui-only v68-marquee');rect.setAttribute('aria-hidden','true');svg.append(rect);}
   for(const [k,v]of Object.entries({x:r.x,y:r.y,width:r.w,height:r.h}))rect.setAttribute(k,v);
  }else{
   try{
    const delta=boundedMarkMoveV68(doc,drag.ids,Math.round((p.x-drag.start.x)*2)/2,Math.round((p.y-drag.start.y)*2)/2,{snap:snap?10:0});
    drag.dx=delta.dx;drag.dy=delta.dy;drag.moved=delta.dx!==0||delta.dy!==0;
    for(const origin of drag.origins)host.querySelector(`[data-mark-object="${CSS.escape(origin.id)}"]`)?.setAttribute('transform',`translate(${origin.x+delta.dx} ${origin.y+delta.dy})`);
   }catch(error){cancelDrag();toast(error.message);return;}
  }
  stage.classList.toggle('is-dragging',drag.moved);
 };
 stage.onpointerup=e=>{
  if(!drag||e.pointerId!==drag.pointerId)return;const d=drag;drag=null;releasePointer(stage,d.pointerId);stage.classList.remove('is-dragging');
  if(d.kind==='resize'){if(d.moved)safely(()=>commit(d.candidate));renderBoard();}
  else if(d.kind==='marquee'){
   const r=marqueeBounds(d),ids=d.moved?visibleMarkElementsV67(doc).filter(x=>!x.locked&&x.x>=r.x&&x.y>=r.y&&x.x+x.w<=r.x+r.w&&x.y+x.h<=r.y+r.h).map(x=>x.id):[];
   normalizeSelection(d.additive?[...d.originalIds,...ids]:ids);inspectorTab='object';render();
  }else if(d.moved){safely(()=>commit(moveMarkSelectionV68(doc,d.ids,d.dx,d.dy)));renderBoard();}
  else if(d.pendingToggle)select(d.pendingToggle,{additive:true});
  else if(d.pendingCollapse)select(d.pendingCollapse);
  else render();
 };
 stage.onpointercancel=cancelDrag;stage.onlostpointercapture=()=>{if(drag)cancelDrag();};

 page.querySelector('[data-mark-image-file]').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;toast('正在处理图片…');const asset=await processArtworkFileV60(file),next=clone(doc),el=createImageElementV60(asset,{id:'label',w:doc.artboard.width,h:doc.artboard.height},{id:`image-${uid()}`,panelId:'label'});el.group='marks';next.elements.push(el);next.selectedId=el.id;inspectorTab='object';commit(next);toast('图片已嵌入唛头项目');}catch(error){toast(error.message);}finally{e.target.value='';}};
 render();requestAnimationFrame(fit);
}
window.addEventListener('resize',()=>{if(host?.isConnected)fit();});
window.addEventListener('keydown',e=>{
 if(window.BoxStudioEditor?.getState().page!=='mark-studio'||document.querySelector('dialog[open]'))return;
 const input=e.target?.closest?.('input,textarea,select,[contenteditable="true"]'),key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
 if(mod&&key==='s'){e.preventDefault();safely(()=>saveProject());return;}
 if(input)return;
 // Focus mode owns Escape so cancellation and panel restoration run once.
 if(key==='escape'){if(document.body.dataset.v69Focus==='true'||e.defaultPrevented)return;e.preventDefault();if(drag)cancelDrag();else select('');return;}
 if(mod&&key==='z'){e.preventDefault();historyStep(e.shiftKey?1:-1);return;}
 if(mod&&key==='y'){e.preventDefault();historyStep(1);return;}
 if(mod&&key==='a'){e.preventDefault();cancelDrag();normalizeSelection(visibleMarkElementsV67(doc).filter(x=>!x.locked).map(x=>x.id));inspectorTab='object';render();return;}
 if(mod&&key==='d'){e.preventDefault();objectAction('duplicate');return;}
 if(['Delete','Backspace'].includes(e.key)&&selectionIds.length){e.preventDefault();objectAction('delete');return;}
 const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(delta&&!mod&&selectionIds.length){e.preventDefault();cancelDrag();const step=e.shiftKey?10:1;safely(()=>commit(moveMarkSelectionV68(doc,selectionIds,delta[0]*step,delta[1]*step)));}
});

export const standaloneMarkUiV67={getState:()=>clone(doc),getSelection:()=>[...selectionIds],getHistory:()=>({index,length:history.length}),select:ids=>{cancelDrag();normalizeSelection(ids);inspectorTab='object';render();},mount,cancelGesture:()=>{if(!drag)return false;cancelDrag();return true;},saveProject,openProjects,openExport,commit,undo:()=>historyStep(-1),redo:()=>historyStep(1),fit,exportPng};
