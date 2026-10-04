const norm=v=>String(v??'').trim().toLowerCase().replace(/[：:]/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\.$/,'');
const blank=v=>String(v??'').trim()==='';

const ALIASES={
  sku:['sku','item','item no','item number','model','model no','货号','型号'],
  nw:['nw','n.w','n.w.','net weight','net wt','net','净重'],
  gw:['gw','g.w','g.w.','gross weight','gross wt','gross','毛重'],
  length:['length','len','l','长','长度'],
  width:['width','wid','w','宽','宽度'],
  height:['height','hei','h','高','高度'],
  dimensionUnit:['dimension unit','size unit','meas unit','尺寸单位'],
  weightUnit:['weight unit','wt unit','重量单位'],
  crn:['crn','customs registration','customs code','海关编码','海关备案号'],
  contractNo:['contract no','contract number','contract','合同号','合同编号'],
  originCountry:['origin country','country of origin','made in','原产国','原产地'],
  destinationCountry:['destination country','destination','dest country','目的国','目的地'],
  packageIndex:['package index','pkg index','package no','pkg no','carton no','包裹序号','箱号'],
  packageCount:['package count','total packages','total pkg','pkg count','包裹总数','总箱数'],
  qrValue:['qr value','qr code','qrcode','qr'],
  __packageMeas:['package meas','package measurement','carton size','box size','meas','包装尺寸','箱规','尺寸'],
};

const FILL_DOWN_KEYS=new Set(['sku','dimensionUnit','weightUnit','crn','contractNo','originCountry','destinationCountry','packageCount']);
const FOOTER=/^(?:grand\s+total|sub\s*total|total|subtotal|合计|总计|小计|汇总)(?:\s|$|[:：])/i;

export function canonicalHeaderKeyV29(value=''){
  const n=norm(value);if(!n)return'';
  for(const[key,aliases]of Object.entries(ALIASES))if(aliases.some(a=>norm(a)===n))return key;
  if(/package\s*meas|carton\s*size|box\s*size|尺寸|箱规/i.test(String(value)))return'__packageMeas';
  if(/package\s*(x|index)|pkg\s*(x|index)|包裹序号/i.test(String(value)))return'packageIndex';
  if(/package\s*(total|count)|total\s*packages|包裹总数|总箱数/i.test(String(value)))return'packageCount';
  return'';
}

export function columnIndexV29(ref='A1'){const letters=(String(ref).match(/[A-Z]+/i)||['A'])[0].toUpperCase();let n=0;for(const ch of letters)n=n*26+(ch.charCodeAt(0)-64);return n-1;}
export function rowIndexV29(ref='A1'){const m=String(ref).match(/(\d+)/);return Math.max(0,(Number(m?.[1])||1)-1);}
export function parseMergeRefV29(ref=''){const [a,b=a]=String(ref).split(':');return{r1:rowIndexV29(a),c1:columnIndexV29(a),r2:rowIndexV29(b),c2:columnIndexV29(b)};}

export function expandMergedCellsV29(matrix=[],mergeRefs=[]){const out=(matrix||[]).map(r=>[...(r||[])]);for(const ref of mergeRefs||[]){const{r1,c1,r2,c2}=parseMergeRefV29(ref),value=out[r1]?.[c1]??'';for(let r=r1;r<=r2;r++){out[r]??=[];for(let c=c1;c<=c2;c++)if(blank(out[r][c]))out[r][c]=value;}}return out;}

export function detectHeaderRowV29(matrix=[],{scanRows=24,minRecognized=2}={}){let best={index:-1,recognized:-1,score:-1};const limit=Math.min(matrix.length,Math.max(1,scanRows));for(let i=0;i<limit;i++){const row=matrix[i]||[],keys=row.map(canonicalHeaderKeyV29).filter(Boolean),recognized=new Set(keys).size,nonEmpty=row.filter(v=>!blank(v)).length;if(!nonEmpty)continue;const score=recognized*100+Math.min(nonEmpty,20);if(score>best.score)best={index:i,recognized,score};}
  if(best.index>=0&&best.recognized>=minRecognized)return best;
  const first=matrix.findIndex(r=>(r||[]).some(v=>!blank(v)));return{index:first,recognized:best.recognized,score:best.score,fallback:true};}

export function isFooterRowV29(row=[]){const cells=(row||[]).map(v=>String(v??'').trim()).filter(Boolean);if(!cells.length)return false;const first=cells[0],joined=cells.slice(0,3).join(' ');return FOOTER.test(first)||FOOTER.test(joined);}

export function matrixToDatasetV29(matrix=[],{mergeRefs=[],fillDown=true,scanRows=24,minRecognized=2,formulaWarnings=[]}={}){
  const expanded=expandMergedCellsV29(matrix,mergeRefs),header=detectHeaderRowV29(expanded,{scanRows,minRecognized});
  if(header.index<0)return{headers:[],rows:[],headerRow:0,footerRow:null,importDiagnostics:{headerDetected:false,headerFallback:true,mergedRanges:(mergeRefs||[]).length,fillDownCells:0,formulaWarnings:[...(formulaWarnings||[])]}};
  const rawHeaders=expanded[header.index]||[],headers=rawHeaders.map((v,i)=>String(v??'').trim()||`Column ${i+1}`),canonical=headers.map(canonicalHeaderKeyV29),lastValues=Array(headers.length).fill('');let footerRow=null,fillDownCells=0;const rows=[];
  for(let ri=header.index+1;ri<expanded.length;ri++){
    const source=[...(expanded[ri]||[])];if(isFooterRowV29(source)){footerRow=ri+1;break;}if(!source.some(v=>!blank(v)))continue;
    if(fillDown){for(let ci=0;ci<headers.length;ci++){const key=canonical[ci];if(!FILL_DOWN_KEYS.has(key))continue;if(blank(source[ci])&&!blank(lastValues[ci])){source[ci]=lastValues[ci];fillDownCells++;}else if(!blank(source[ci]))lastValues[ci]=source[ci];}}
    const obj={__row:ri+1};headers.forEach((h,ci)=>{obj[h]=source[ci]??''});rows.push(obj);
  }
  return{headers,rows,headerRow:header.index+1,footerRow,importDiagnostics:{headerDetected:!header.fallback,headerFallback:Boolean(header.fallback),recognizedHeaders:header.recognized,mergedRanges:(mergeRefs||[]).length,fillDownCells,footerDetected:Boolean(footerRow),formulaWarnings:[...(formulaWarnings||[])]}};
}

export function importDiagnosticsSummaryV29(dataset={}){const d=dataset.importDiagnostics||{};return{headerRow:dataset.headerRow||0,footerRow:dataset.footerRow||null,rows:(dataset.rows||[]).length,recognizedHeaders:Number(d.recognizedHeaders)||0,mergedRanges:Number(d.mergedRanges)||0,fillDownCells:Number(d.fillDownCells)||0,formulaWarningCount:(d.formulaWarnings||[]).length,headerFallback:Boolean(d.headerFallback),footerDetected:Boolean(d.footerDetected)};}
