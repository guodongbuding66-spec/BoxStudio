export const VARIABLE_FIELDS = [
  ['','忽略'],['sku','SKU'],['nw','N.W.'],['gw','G.W.'],['__packageMeas','Package Meas'],['length','Length'],['width','Width'],['height','Height'],['dimensionUnit','Dimension Unit'],['weightUnit','Weight Unit'],['crn','CRN'],['contractNo','Contract No.'],['originCountry','Origin Country'],['destinationCountry','Destination Country'],['packageIndex','Package Index'],['packageCount','Package Count'],['qrValue','QR Value']
];

const VAR_ALIASES = {
  sku:['sku','item','itemno','itemnumber','model','modelno'],
  nw:['nw','n.w','n.w.','netweight','netwt','net'],
  gw:['gw','g.w','g.w.','grossweight','grosswt','gross'],
  length:['length','len','l'], width:['width','wid','w'], height:['height','hei','h'],
  dimensionUnit:['dimensionunit','dimension unit','sizeunit','measunit','meas unit'],
  weightUnit:['weightunit','weight unit','wtunit','wt unit'],
  crn:['crn','customsregistration','customs registration','customscode','customs code'],
  contractNo:['contractno','contract no','contractnumber','contract number','contract'],
  originCountry:['origincountry','origin country','countryoforigin','country of origin','madein','made in'],
  destinationCountry:['destinationcountry','destination country','destination','destcountry','dest country'],
  packageIndex:['packageindex','package index','pkgindex','pkg index','packageno','package no','pkgno','pkg no','cartonno','carton no'],
  packageCount:['packagecount','package count','totalpackages','total packages','totalpkg','total pkg','pkgcount','pkg count'],
  qrValue:['qrvalue','qr value','qrcode','qr code','qr'],
};

function normHeader(v=''){return String(v).trim().toLowerCase().replace(/[：:]/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\.$/,'')}
function colIndexFromRef(ref='A1'){const letters=(String(ref).match(/[A-Z]+/i)||['A'])[0].toUpperCase();let n=0;for(const ch of letters)n=n*26+(ch.charCodeAt(0)-64);return n-1}
function cellText(cell,shared){const t=cell.getAttribute('t')||'';if(t==='inlineStr')return Array.from(cell.getElementsByTagName('t')).map(x=>x.textContent||'').join('');const v=cell.getElementsByTagName('v')[0]?.textContent??'';if(t==='s')return shared[Number(v)]??'';if(t==='b')return v==='1'?'TRUE':'FALSE';return v}
function sheetToMatrix(xml,shared){const doc=new DOMParser().parseFromString(xml,'application/xml');const rows=[];for(const row of Array.from(doc.getElementsByTagName('row'))){const arr=[];for(const cell of Array.from(row.getElementsByTagName('c'))){const idx=colIndexFromRef(cell.getAttribute('r')||'A1');arr[idx]=cellText(cell,shared)}rows.push(arr.map(v=>v??''))}return rows}
function matrixToDataset(matrix){if(matrix.length<2)return{headers:matrix[0]?.map(v=>String(v??'').trim())||[],rows:[]};const headers=matrix[0].map(v=>String(v??'').trim());const rows=matrix.slice(1).filter(r=>r.some(v=>String(v??'').trim()!=='')).map((r,i)=>{const obj={__row:i+2};headers.forEach((h,idx)=>{if(h)obj[h]=r[idx]??''});return obj});return{headers,rows}}

async function parseXlsxWorkbook(file){
  if(!globalThis.JSZip)throw new Error('JSZip 未加载，无法读取 XLSX');
  const zip=await globalThis.JSZip.loadAsync(await file.arrayBuffer());const text=async path=>{const f=zip.file(path);return f?await f.async('string'):''};
  const shared=[];const ss=await text('xl/sharedStrings.xml');if(ss){const doc=new DOMParser().parseFromString(ss,'application/xml');for(const si of Array.from(doc.getElementsByTagName('si')))shared.push(Array.from(si.getElementsByTagName('t')).map(t=>t.textContent||'').join(''))}
  const wb=await text('xl/workbook.xml');const wbDoc=new DOMParser().parseFromString(wb,'application/xml');const relXml=await text('xl/_rels/workbook.xml.rels');const relDoc=new DOMParser().parseFromString(relXml,'application/xml');
  const rels={};for(const rel of Array.from(relDoc.getElementsByTagName('Relationship')))rels[rel.getAttribute('Id')]=rel.getAttribute('Target')||'';
  const sheets=[];for(const sh of Array.from(wbDoc.getElementsByTagName('sheet'))){const name=sh.getAttribute('name')||`Sheet ${sheets.length+1}`;const rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');let target=rels[rid]||`worksheets/sheet${sheets.length+1}.xml`;target=target.replace(/^\//,'').replace(/^xl\//,'');const xml=await text('xl/'+target);if(!xml)continue;const ds=matrixToDataset(sheetToMatrix(xml,shared));sheets.push({name,...ds})}
  if(!sheets.length)throw new Error('Excel 文件没有可读取的工作表');return sheets;
}
function parseCsvText(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}else{if(ch==='"')quoted=true;else if(ch===','||ch==='\t'){row.push(field);field=''}else if(ch==='\n'){row.push(field);rows.push(row);row=[];field=''}else if(ch!=='\r')field+=ch}}if(field.length||row.length){row.push(field);rows.push(row)}return rows}

export async function parseBatchWorkbook(file){
  if(!file)throw new Error('请选择 Excel 或 CSV 文件');const lower=file.name.toLowerCase();
  if(lower.endsWith('.xlsx'))return{fileName:file.name,sheets:await parseXlsxWorkbook(file)};
  const ds=matrixToDataset(parseCsvText(await file.text()));if(!ds.rows.length)throw new Error('文件至少需要标题行和 1 行数据');return{fileName:file.name,sheets:[{name:'CSV',...ds}]};
}
export async function parseBatchFile(file){const wb=await parseBatchWorkbook(file),s=wb.sheets[0];return{headers:s.headers,rows:s.rows,sheetName:s.name,sheets:wb.sheets}}

export function autoMapHeaders(headers=[]){const map={};for(const h of headers){const nh=normHeader(h);for(const [key,aliases] of Object.entries(VAR_ALIASES)){if(aliases.some(a=>normHeader(a)===nh)){map[h]=key;break}}if(!map[h]&&/package\s*meas|meas|carton\s*size|box\s*size|尺寸/i.test(h))map[h]='__packageMeas';if(!map[h]&&/package\s*(x|index)|pkg\s*(x|index)|包裹序号/i.test(h))map[h]='packageIndex';if(!map[h]&&/package\s*(total|count)|total\s*packages|包裹总数/i.test(h))map[h]='packageCount'}return map}
function parsePackageMeas(value){const s=String(value??'').trim(),nums=(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number),unit=/\b(mm|cm|in|inch|inches)\b/i.exec(s)?.[1]?.toUpperCase();if(nums.length>=3)return{length:String(nums[0]),width:String(nums[1]),height:String(nums[2]),dimensionUnit:unit==='MM'?'MM':unit==='CM'?'CM':'INCH'};return{}}
export function rowToVariables(row,headers,mapping=autoMapHeaders(headers),base={}){const next={...base};for(const h of headers){const key=mapping[h];if(!key)continue;const value=row[h];if(key==='__packageMeas')Object.assign(next,parsePackageMeas(value));else if(value!==undefined&&value!==null&&String(value).trim()!=='')next[key]=String(value).trim()}for(const h of headers){if(!/^(package|pkg|carton)$/i.test(String(h).trim()))continue;const m=/^\s*(\d+)\s*[\/\-]\s*(\d+)\s*$/.exec(String(row[h]??''));if(m){next.packageIndex=m[1];next.packageCount=m[2]}}if(!next.qrValue&&next.sku)next.qrValue=next.sku;return next}
export function safeBatchFileName(vars={},index=0,ext='svg'){const sku=String(vars.sku||`row-${index+1}`).replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'')||`row-${index+1}`;const pkg=vars.packageCount&&Number(vars.packageCount)>1?`-P${vars.packageIndex||index+1}of${vars.packageCount}`:'';return`${sku}${pkg}.${ext}`}
