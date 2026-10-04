import { canonicalHeaderKeyV29, columnIndexV29 } from './batchImportV29.js';
import { matrixToDatasetV30, parseXlsxStylesV30, restoreCellNumericTextV30 } from './batchImportV30.js';

export const VARIABLE_FIELDS = [
  ['','忽略'],['sku','SKU'],['nw','N.W.'],['gw','G.W.'],['__packageMeas','Package Meas'],['length','Length'],['width','Width'],['height','Height'],['dimensionUnit','Dimension Unit'],['weightUnit','Weight Unit'],['crn','CRN'],['contractNo','Contract No.'],['originCountry','Origin Country'],['destinationCountry','Destination Country'],['packageIndex','Package Index'],['packageCount','Package Count'],['qrValue','QR Value']
];

function cellValue(cell,shared,styles){const t=cell.getAttribute('t')||'',raw=cell.getElementsByTagName('v')[0]?.textContent??'';if(t==='inlineStr')return{value:Array.from(cell.getElementsByTagName('t')).map(x=>x.textContent||'').join(''),restored:false};if(t==='s')return{value:shared[Number(raw)]??'',restored:false};if(t==='b')return{value:raw==='1'?'TRUE':'FALSE',restored:false};const restored=restoreCellNumericTextV30(raw,{styleIndex:cell.getAttribute('s'),styles});return restored;}
function sheetToGrid(xml,shared,styles){const doc=new DOMParser().parseFromString(xml,'application/xml'),rows=[],formulaWarnings=[],leadingZeroRestorations=[];for(const row of Array.from(doc.getElementsByTagName('row'))){const arr=[],rowIndex=Math.max(0,(Number(row.getAttribute('r'))||rows.length+1)-1);for(const cell of Array.from(row.getElementsByTagName('c'))){const ref=cell.getAttribute('r')||'A1',idx=columnIndexV29(ref),hasFormula=cell.getElementsByTagName('f').length>0,hasCached=cell.getElementsByTagName('v').length>0||cell.getAttribute('t')==='inlineStr';if(hasFormula&&!hasCached)formulaWarnings.push({cell:ref,code:'FORMULA_NO_CACHED_VALUE',message:'Formula cell has no cached value in the XLSX package.'});const value=cellValue(cell,shared,styles);arr[idx]=value.value;if(value.restored)leadingZeroRestorations.push({cell:ref,from:cell.getElementsByTagName('v')[0]?.textContent??'',to:value.value,formatCode:value.formatCode})}rows[rowIndex]=arr.map(v=>v??'')}
  const mergeRefs=Array.from(doc.getElementsByTagName('mergeCell')).map(n=>n.getAttribute('ref')).filter(Boolean);return{matrix:rows.map(r=>r||[]),mergeRefs,formulaWarnings,leadingZeroRestorations};}

async function parseXlsxWorkbook(file){
  if(!globalThis.JSZip)throw new Error('JSZip 未加载，无法读取 XLSX');
  const zip=await globalThis.JSZip.loadAsync(await file.arrayBuffer());const text=async path=>{const f=zip.file(path);return f?await f.async('string'):''};
  const shared=[];const ss=await text('xl/sharedStrings.xml');if(ss){const doc=new DOMParser().parseFromString(ss,'application/xml');for(const si of Array.from(doc.getElementsByTagName('si')))shared.push(Array.from(si.getElementsByTagName('t')).map(t=>t.textContent||'').join(''))}
  const styles=parseXlsxStylesV30(await text('xl/styles.xml'));
  const wb=await text('xl/workbook.xml');const wbDoc=new DOMParser().parseFromString(wb,'application/xml');const relXml=await text('xl/_rels/workbook.xml.rels');const relDoc=new DOMParser().parseFromString(relXml,'application/xml');
  const rels={};for(const rel of Array.from(relDoc.getElementsByTagName('Relationship')))rels[rel.getAttribute('Id')]=rel.getAttribute('Target')||'';
  const sheets=[];for(const sh of Array.from(wbDoc.getElementsByTagName('sheet'))){const name=sh.getAttribute('name')||`Sheet ${sheets.length+1}`;const rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');let target=rels[rid]||`worksheets/sheet${sheets.length+1}.xml`;target=target.replace(/^\//,'').replace(/^xl\//,'');const xml=await text('xl/'+target);if(!xml)continue;const grid=sheetToGrid(xml,shared,styles),ds=matrixToDatasetV30(grid.matrix,{mergeRefs:grid.mergeRefs,formulaWarnings:grid.formulaWarnings,leadingZeroRestorations:grid.leadingZeroRestorations});sheets.push({name,...ds})}
  if(!sheets.length)throw new Error('Excel 文件没有可读取的工作表');return sheets;
}
function parseCsvText(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}else{if(ch==='"')quoted=true;else if(ch===','||ch==='\t'){row.push(field);field=''}else if(ch==='\n'){row.push(field);rows.push(row);row=[];field=''}else if(ch!=='\r')field+=ch}}if(field.length||row.length){row.push(field);rows.push(row)}return rows}

export async function parseBatchWorkbook(file){
  if(!file)throw new Error('请选择 Excel 或 CSV 文件');const lower=file.name.toLowerCase();
  if(lower.endsWith('.xlsx'))return{fileName:file.name,sheets:await parseXlsxWorkbook(file)};
  const ds=matrixToDatasetV30(parseCsvText(await file.text()));if(!ds.rows.length)throw new Error('文件至少需要标题行和 1 行数据');return{fileName:file.name,sheets:[{name:'CSV',...ds}]};
}
export async function parseBatchFile(file){const wb=await parseBatchWorkbook(file),s=wb.sheets[0];return{headers:s.headers,rows:s.rows,sheetName:s.name,sheets:wb.sheets,headerRow:s.headerRow,footerRow:s.footerRow,importDiagnostics:s.importDiagnostics}}

export function autoMapHeaders(headers=[]){const map={};for(const h of headers){const key=canonicalHeaderKeyV29(h);if(key)map[h]=key}return map}
function parsePackageMeas(value){const s=String(value??'').trim(),nums=(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number),unit=/\b(mm|cm|in|inch|inches)\b/i.exec(s)?.[1]?.toUpperCase();if(nums.length>=3)return{length:String(nums[0]),width:String(nums[1]),height:String(nums[2]),dimensionUnit:unit==='MM'?'MM':unit==='CM'?'CM':'INCH'};return{}}
export function rowToVariables(row,headers,mapping=autoMapHeaders(headers),base={}){const next={...base};for(const h of headers){const key=mapping[h];if(!key)continue;const value=row[h];if(key==='__packageMeas')Object.assign(next,parsePackageMeas(value));else if(value!==undefined&&value!==null&&String(value).trim()!=='')next[key]=String(value).trim()}for(const h of headers){if(!/^(package|pkg|carton)$/i.test(String(h).trim()))continue;const m=/^\s*(\d+)\s*[\/\-]\s*(\d+)\s*$/.exec(String(row[h]??''));if(m){next.packageIndex=m[1];next.packageCount=m[2]}}if(!next.qrValue&&next.sku)next.qrValue=next.sku;return next}
export function safeBatchFileName(vars={},index=0,ext='svg'){const sku=String(vars.sku||`row-${index+1}`).replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'')||`row-${index+1}`;const pkg=vars.packageCount&&Number(vars.packageCount)>1?`-P${vars.packageIndex||index+1}of${vars.packageCount}`:'';return`${sku}${pkg}.${ext}`}
