import { matrixToDatasetV29 } from './batchImportV29.js';

const xmlUnescape=s=>String(s??'').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

export function leadingZeroWidthV30(formatCode=''){
  const first=xmlUnescape(formatCode).split(';')[0].trim().replace(/^"|"$/g,'');
  if(!/^0{2,}$/.test(first))return 0;
  return first.length;
}

export function restoreLeadingZerosV30(value,formatCode=''){
  const width=leadingZeroWidthV30(formatCode),raw=String(value??'').trim();
  if(!width||!/^\d+$/.test(raw)||raw.length>=width)return raw;
  return raw.padStart(width,'0');
}

function attr(tag,name){const m=String(tag).match(new RegExp(`${name}=["']([^"']*)["']`,'i'));return m?xmlUnescape(m[1]):'';}

export function parseXlsxStylesV30(xml=''){
  const text=String(xml||''),custom={};
  for(const m of text.matchAll(/<numFmt\b[^>]*\/>/gi)){const id=Number(attr(m[0],'numFmtId'));if(Number.isFinite(id))custom[id]=attr(m[0],'formatCode');}
  const cellXfsBlock=/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/i.exec(text)?.[1]||'';
  const xfs=[];for(const m of cellXfsBlock.matchAll(/<xf\b[^>]*\/?\s*>/gi)){const id=Number(attr(m[0],'numFmtId'));xfs.push({numFmtId:Number.isFinite(id)?id:0,formatCode:custom[id]||builtinFormat(id)});}
  return{xfs,custom};
}

function builtinFormat(id){const map={0:'General',1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',9:'0%',10:'0.00%'};return map[id]||'';}

export function formatCodeForStyleV30(styles,styleIndex){const i=Number(styleIndex);if(!Number.isFinite(i)||i<0)return'';return styles?.xfs?.[i]?.formatCode||'';}

export function restoreCellNumericTextV30(rawValue,{styleIndex=null,styles=null}={}){
  const formatCode=formatCodeForStyleV30(styles,styleIndex),restored=restoreLeadingZerosV30(rawValue,formatCode);
  return{value:restored,restored:restored!==String(rawValue??'').trim(),formatCode};
}

export function matrixToDatasetV30(matrix=[],options={}){
  const{leadingZeroRestorations=[], ...base}=options||{},ds=matrixToDatasetV29(matrix,base);
  ds.importDiagnostics={...(ds.importDiagnostics||{}),leadingZeroRestorations:[...(leadingZeroRestorations||[])],leadingZeroRestorationCount:(leadingZeroRestorations||[]).length};
  return ds;
}
