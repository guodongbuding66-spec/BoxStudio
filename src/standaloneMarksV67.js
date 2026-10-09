import {handlingSymbolV72,handlingParamsV72} from './handlingSymbolsV72.js';
import {generatedCodeSvgV72,validateGeneratedCodeV72,generatedCodeChecksV72} from './codeGeneratorV72.js';
import {barcodeSizeV70,barcodeGroupLayoutV70,barcodeChecksV70,BARCODE_SIZE_MESSAGE_V70} from './barcodeGroupV70.js';
import {standaloneIconSvgV67} from './standaloneIconV67.js';
import {defaultState} from './model.js';
import {addMarkPresetV66,validateMarkDataV66} from './shippingMarkLayoutV66.js';
import {barcodeSvg} from './barcode.js';
import {qrSvgRects} from './qrcode.js';
import {renderTemplate,isPackageNoticeVisible} from './variables.js';
import {buildProductionPdf} from './export.js';
import {imagePreflightChecksV60} from './artworkImageV60.js';
import {getUserTtf} from './fontRegistry.js';

export const MARK_DOCUMENT_KEY_V67='boxstudio-standalone-marks-v1';
export const MARK_DOCUMENT_SCHEMA_V67='boxstudio-standalone-mark';
const clone=x=>structuredClone(x),esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>`label-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
export const MARK_TEMPLATES_V67=[{id:'shipping',label:'标准运输唛头',hint:'运输信息 · 条码组合 · 搬运标识'},{id:'trade',label:'外贸信息唛头',hint:'重量尺寸 · 合同号 · 双 CRN'},{id:'blank',label:'空白画布',hint:'按自己的排版习惯自由设计'}];
export function setMarkArtboardV67(state,w,h){
 const width=Number(w),height=Number(h);if(!Number.isFinite(width)||!Number.isFinite(height)||width<40||height<30||width>1500||height>1500)throw new Error('画布宽需为 40–1500 mm，高需为 30–1500 mm。');
 const next=clone(state);next.artboard={width,height};next.structure={...next.structure,template:'imported',length:width,width:height,height:1,thickness:1,compensation:false,safe:8,bleed:0,importedGeometry:{source:'Standalone Mark',width,height,panels:[{id:'label',label:'唛头画布',kind:'panel',role:'artboard',x:0,y:0,w:width,h:height}],cutLines:[],creaseLines:[],perfLines:[],glueLines:[]}};return next;
}
function text(id,template,x,y,w,h,fontSize=5,bold=false){return{id,type:'text',group:'marks',panelId:'label',template,x,y,w,h,fontSize,bold,r:0};}
export function createMarkDocumentV67(template='shipping'){
 let next=clone(defaultState);next.schema=MARK_DOCUMENT_SCHEMA_V67;next.schemaVersion=1;next.projectId=uid();next.projectName='未命名唛头';next.page='mark-studio';next.editorTab='Marks';next.syncDimensions=false;next.elements=[];next.selectedId='';next.hiddenGroups={marks:false,dieline:true};next.variables={...next.variables,sku:'ITEM-001',qrValue:'ITEM-001',nw:'12.5',gw:'14',weightUnit:'KG',length:'32',width:'22',height:'8',dimensionUnit:'CM',crn:'CRN-000001',contractNo:'CONTRACT-001',packageIndex:'1',packageCount:'1',originCountry:'China',destinationCountry:'US'};next.exportOptions={outlineText:false,spotDielines:false,pdfxMode:'off'};next=setMarkArtboardV67(next,320,220);
 if(template!=='blank'){
  next.elements=[text('label-sku','SKU: {{sku}}',12,16,230,20,7,true),text('label-destination','{{destinationCountry}}',262,16,42,22,12,true),text('label-weight','N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',12,50,145,27,5),text('label-contract','Contract No.: {{contractNo}}',178,50,128,12,4.5),text('label-crn','CRN: {{crn}}',178,66,128,12,4.5),text('label-origin','Made in {{originCountry}}',178,82,128,12,4.5),text('label-dimensions','Package Meas: {{length}} x {{width}} x {{height}} {{dimensionUnit}}',12,94,290,15,4.5),text('label-crn-repeat','CRN: {{crn}}',12,80,155,12,4),{...text('label-notice','Please note the product has {{packageCount}} packages,\nand this is the package {{packageIndex}}',12,198,250,12,4),type:'notice'}];
  if(template==='shipping')next.elements.push({id:'label-barcode',type:'barcode-qr-group',group:'marks',panelId:'label',x:12,y:114,w:250,h:80,r:0,barcodeValue:'{{sku}}',qrValue:'{{qrValue}}',barcodeType:'CODE39',lockAspect:true,preset:'250x80'},...['up','fragile','dry'].map((icon,i)=>({id:`label-${icon}`,type:'icon',icon,group:'marks',panelId:'label',x:278,y:114+i*26,w:24,h:24,r:0})));
 }
 next.selectedId=next.elements[0]?.id||'';return next;
}
export function visibleMarkElementsV67(state){return(state.elements||[]).filter(e=>!e.hidden&&!(e.type==='notice'&&!isPackageNoticeVisible(state.variables)));}
export function insertStandaloneMarkV67(state,id){const result=addMarkPresetV66(state,id,{panelId:'label'});result.state.schema=MARK_DOCUMENT_SCHEMA_V67;return result.state;}
export function patchStandaloneElementV67(state,id,patch){
 const next=clone(state),e=next.elements.find(e=>e.id===id);if(!e)throw new Error('所选对象不存在。');
 if(e.locked)throw new Error('所选图层已锁定，请先解锁。');
 const allowed=['preset','x','y','w','h','fontSize','template','bold','barcodeValue','qrValue','barcodeType','hidden','stackLimit','stackHeight','stackWeight','temperatureMin','temperatureMax','codeType','codeValue','codeShowText'];
 for(const [key,value] of Object.entries(patch))if(allowed.includes(key))e[key]=['x','y','w','h','fontSize','stackLimit','stackHeight','stackWeight','temperatureMin','temperatureMax'].includes(key)?Number(value):value;
 if(['x','y','w','h'].some(k=>!Number.isFinite(e[k]))||e.w<4||e.h<4)throw new Error('对象位置必须为数字，宽高至少 4 mm。');
 if(e.type==='barcode-qr-group'){if('preset'in patch){if(!['250x80','200x64'].includes(patch.preset))throw new Error(BARCODE_SIZE_MESSAGE_V70);[e.w,e.h]=patch.preset==='250x80'?[250,80]:[200,64];}else if('w'in patch)e.h=e.w/3.125;else if('h'in patch)e.w=e.h*3.125;const size=barcodeSizeV70(e.w,e.h);if(!size)throw new Error(BARCODE_SIZE_MESSAGE_V70);e.preset=size.preset;e.lockAspect=true;}
 if('fontSize'in patch&&(!Number.isFinite(e.fontSize)||e.fontSize<1||e.fontSize>80))throw new Error('字号需为 1–80 mm。');
 if(e.type==='icon')handlingParamsV72(e);if(e.type==='generated-code')validateGeneratedCodeV72(e,next.variables);
 next.selectedId=id;return next;
}
export function duplicateStandaloneElementV67(state,id){const next=clone(state),source=next.elements.find(e=>e.id===id);if(!source)throw new Error('请选择要复制的对象。');const copy={...clone(source),id:uid(),x:source.x+6,y:source.y+6};next.elements.push(copy);next.selectedId=copy.id;return next;}
export function validateMarkDocumentV67(s){
 if(!s||s.schema!==MARK_DOCUMENT_SCHEMA_V67||s.schemaVersion!==1||!s.variables||!Array.isArray(s.elements)||s.elements.length>500)throw new Error('不是有效的独立唛头项目。');
 setMarkArtboardV67(s,s.artboard?.width,s.artboard?.height);
 if(typeof s.projectName!=='string'||!s.projectName.trim()||s.projectName.length>160||typeof s.projectId!=='string'||!s.projectId)throw new Error('唛头项目名称或编号无效。');
 if(typeof s.variables!=='object'||Array.isArray(s.variables)||Object.values(s.variables).some(v=>typeof v!=='string'||v.length>2048))throw new Error('唛头项目变量无效。');
 const ids=new Set();for(const e of s.elements){if(!e||!e.id||ids.has(e.id)||!['text','notice','icon','barcode-qr-group','image','shape','generated-code'].includes(e.type))throw new Error('唛头项目包含无效或重复对象。');ids.add(e.id);if(['hidden','locked'].some(k=>k in e&&typeof e[k]!=='boolean'))throw new Error('图层显隐或锁定状态无效。');if(typeof e.id!=='string'||e.id.length>200)throw new Error('唛头对象编号无效。');if(['text','notice'].includes(e.type)&&(typeof e.template!=='string'||e.template.length>10000||!Number.isFinite(e.fontSize)||e.fontSize<1||e.fontSize>80))throw new Error('文字内容或字号无效。');if(e.type==='icon')handlingParamsV72(e);if(e.type==='generated-code')validateGeneratedCodeV72(e,s.variables);if(['x','y','w','h'].some(k=>!Number.isFinite(e[k]))||e.w<=0||e.h<=0||e.r)throw new Error('唛头对象的位置、尺寸或方向无效。');if(e.panelId!=='label')throw new Error('唛头对象不属于当前画布。');if(e.type==='image'&&(!/^data:image\/(png|jpeg|webp);base64,/.test(e.src)||e.src.length>4e6))throw new Error('唛头图片数据无效。');if(e.type==='barcode-qr-group'&&Math.abs(e.w/e.h-3.125)>1e-5)throw new Error('条码组合比例无效。');}
 return true;
}
export function parseMarkDocumentV67(text){const s=JSON.parse(text);validateMarkDocumentV67(s);const next={...createMarkDocumentV67('blank'),...s,variables:{...defaultState.variables,...s.variables},hiddenGroups:{marks:false,dieline:true},exportOptions:{outlineText:false,spotDielines:false,pdfxMode:'off'}};return setMarkArtboardV67(next,s.artboard.width,s.artboard.height);}
export function markPreflightV67(state,{pdf=false}={}){
 const errors=validateMarkDataV66(state.variables).map(message=>({severity:'error',message})),warnings=[];
 for(const e of visibleMarkElementsV67(state)){
  if(e.x<0||e.y<0||e.x+e.w>state.artboard.width+.01||e.y+e.h>state.artboard.height+.01)errors.push({severity:'error',message:`${e.id} 超出画布。`});
  else if(e.x<8||e.y<8||e.x+e.w>state.artboard.width-8||e.y+e.h>state.artboard.height-8)warnings.push({severity:'warning',message:`${e.id} 靠近画布边缘。`});
  if(['text','notice'].includes(e.type)){
   const value=renderTemplate(e.template,state.variables);for(const key of [...String(e.template).matchAll(/{{\s*(\w+)\s*}}/g)].map(m=>m[1]))if(!String(state.variables[key]??'').trim())errors.push({severity:'error',message:`变量 ${key} 未填写。`});
   if(pdf&&getUserTtf()&&[...value].some(c=>c.codePointAt(0)>32&&!getUserTtf().cmap(c.codePointAt(0))))errors.push({severity:'error',message:'所加载的字体缺少当前文字中的字符，请更换 TTF 字体。'});
   if(pdf&&/[^\x00-\x7f]/.test(value)&&!getUserTtf())errors.push({severity:'error',message:'中文生产 PDF 请先在导出窗口加载支持中文的 TTF 字体。'});
  }
 }
 for(const e of visibleMarkElementsV67(state).filter(e=>e.type==='icon'))try{handlingParamsV72(e);}catch(error){errors.push({severity:'error',message:error.message});}
 errors.push(...generatedCodeChecksV72(state));
 for(const c of barcodeChecksV70(state))if(c.severity==='error')errors.push(c);
 for(const c of imagePreflightChecksV60({...state,elements:visibleMarkElementsV67(state)}))if(c.severity!=='pass')(c.severity==='error'?errors:warnings).push({severity:c.severity,message:c.detail});
 return{errors,warnings,ok:errors.length===0};
}
export function buildMarkPdfV67(state){const report=markPreflightV67(state,{pdf:true});if(!report.ok)throw new Error(report.errors.map(x=>x.message).join('\n'));const next=clone(state);next.elements=visibleMarkElementsV67(state).map(e=>e.type==='icon'?{...e,standaloneIconV67:true}:e);next.exportOptions={...next.exportOptions,pdfxMode:'off',outlineText:Boolean(getUserTtf()),fontMode:getUserTtf()?'ttf':'technical',producer:'BoxStudio V0.72',documentTitle:'Standalone Shipping Mark Artwork'};return buildProductionPdf(next);}
function markContent(e,state){
 if(e.type==='text'||e.type==='notice'){const fs=e.fontSize||5;return renderTemplate(e.template,state.variables).split('\n').map((line,i)=>`<text x="3" y="${(i+1)*fs*1.15}" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="${e.bold?700:400}" fill="#111" class="svg-text">${esc(line)}</text>`).join('');}
 if(e.type==='generated-code')return generatedCodeSvgV72(e,state.variables);
 if(e.type==='icon')return standaloneIconSvgV67(e);
 if(e.type==='image')return `<image href="${esc(e.src)}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid meet"/>`;
 if(e.type==='shape')return `<rect width="${e.w}" height="${e.h}" fill="none" stroke="#111" stroke-width=".6"/>`;
 if(e.type==='barcode-qr-group'){const {pad,qrSide:side,bw,bh,fontSize,labelBaseline,stroke}=barcodeGroupLayoutV70(e),bars=barcodeSvg(e.barcodeType||'CODE39',renderTemplate(e.barcodeValue,state.variables),bw,bh),qr=qrSvgRects(renderTemplate(e.qrValue,state.variables),side,side);return `<rect width="${e.w}" height="${e.h}" fill="#fff" stroke="#111" stroke-width="${stroke}"/><g transform="translate(${pad} ${pad})" fill="#111">${bars.rects}</g><text x="${pad}" y="${labelBaseline}" font-family="Arial,sans-serif" font-size="${fontSize}">${esc(bars.label)}</text><g transform="translate(${e.w-pad-side} ${pad})" fill="#111">${qr.rects}</g>`;}
 return'';
}
function resizeHandlesSvgV69(e,size){
 const s=Number.isFinite(size)&&size>0?size:4;
 return ['nw','ne','sw','se'].map(c=>{const x=c.includes('w')?0:e.w,y=c.includes('n')?0:e.h;return `<g class="ui-only v69-resize-handle" data-mark-resize="${c}" aria-hidden="true" transform="translate(${x} ${y})"><rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" fill="transparent" pointer-events="all"/><rect x="${-s*.275}" y="${-s*.275}" width="${s*.55}" height="${s*.55}" fill="#fff" stroke="#315cda" stroke-width="1.2" vector-effect="non-scaling-stroke" pointer-events="none"/></g>`;}).join('');
}
export function buildMarkSvgV67(state,{ui=false,grid=false,selectedIds=[state.selectedId],resizeHandles=false,handleSize=4}={}){
 const {width:w,height:h}=state.artboard;
 const selection=new Set(selectedIds);
 const guides=ui?`<g class="ui-only"><rect x="8" y="8" width="${w-16}" height="${h-16}" fill="none" stroke="#9eb2d8" stroke-dasharray="2 2" stroke-width=".3"/>${grid?`<defs><pattern id="mark-grid" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".45" fill="#d3d9e3"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#mark-grid)"/>`:''}</g>`:'';
 const elements=visibleMarkElementsV67(state).map(e=>{let content;try{content=markContent(e,state)}catch(error){content=`<text x="2" y="8" fill="#b42318" font-size="4">${esc(error.message)}</text>`;}return`<g data-mark-object="${esc(e.id)}" transform="translate(${e.x} ${e.y})">${ui?`<rect width="${e.w}" height="${e.h}" fill="transparent" class="mark-hit"/>`:''}${content}${ui&&resizeHandles&&selectedIds.length===1&&selection.has(e.id)&&!e.locked?resizeHandlesSvgV69(e,handleSize):''}${ui&&selection.has(e.id)?`<rect class="ui-only selection-box ${e.locked?'is-locked':''}" aria-hidden="true" x="-1" y="-1" width="${e.w+2}" height="${e.h+2}" fill="none" stroke="#315cda" stroke-width=".5"/>`:''}</g>`;}).join('');
 return`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" role="img" aria-label="独立唛头画布"><rect width="${w}" height="${h}" fill="#fff"/>${guides}${elements}</svg>`;
}
