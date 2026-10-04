import { buildImportReviewRowsV30 } from './importReviewV30.js';

const xml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function col(index){let n=index+1,out='';while(n){const r=(n-1)%26;out=String.fromCharCode(65+r)+out;n=Math.floor((n-1)/26);}return out;}
function cell(ref,value){return`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;}
function sheetXml(rows){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>cell(`${col(ci)}${ri+1}`,v)).join('')}</row>`).join('')}</sheetData></worksheet>`;}

export function failedRowsTableV30(state,{preflightSummary=null}={}){
  const review=buildImportReviewRowsV30(state,{preflightSummary}).filter(r=>r.status==='failed'),headers=[...(state?.batch?.columns||[])];
  const table=[['Source Row','SKU','Error Codes','Errors','Cell Hints',...headers]];
  for(const item of review){table.push([item.sourceRow,item.sku,item.issues.map(i=>i.code||'').filter(Boolean).join(' | '),item.issues.map(i=>i.title||i.detail||'Error').join(' | '),item.issues.map(i=>i.cell||'').filter(Boolean).join(' | '),...headers.map(h=>item.row?.[h]??'')]);}
  return table;
}

export function failedRowsXlsxPartsV30(state,{preflightSummary=null}={}){
  const table=failedRowsTableV30(state,{preflightSummary});
  return{
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Failed Rows" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':sheetXml(table),
  };
}

export async function buildFailedRowsXlsxV30(state,{preflightSummary=null}={}){
  if(!globalThis.JSZip)throw new Error('JSZip 未加载，无法生成 failed_rows.xlsx');
  const parts=failedRowsXlsxPartsV30(state,{preflightSummary}),zip=new globalThis.JSZip();for(const[path,content]of Object.entries(parts))zip.file(path,content);return await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}
