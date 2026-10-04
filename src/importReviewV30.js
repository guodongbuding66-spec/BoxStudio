import { summarizeBatchPreflight } from './batchTemplates.js';

const text=v=>String(v??'').trim();

export function fieldFromPreflightIssueV30(issue={}){
  if(issue.field)return String(issue.field);
  const code=String(issue.code||'').toUpperCase(),title=String(issue.title||'').toUpperCase();
  const s=`${code} ${title}`;
  if(/\bSKU\b/.test(s))return'sku';
  if(/\bNW\b|NET.?WEIGHT/.test(s))return'nw';
  if(/\bGW\b|GROSS.?WEIGHT/.test(s))return'gw';
  if(/CRN|CUSTOMS/.test(s))return'crn';
  if(/CONTRACT/.test(s))return'contractNo';
  if(/ORIGIN|MADE.?IN/.test(s))return'originCountry';
  if(/DESTINATION/.test(s))return'destinationCountry';
  if(/PACKAGE.?COUNT|TOTAL.?PACKAGE/.test(s))return'packageCount';
  if(/PACKAGE.?INDEX|PACKAGE.?NO|CURRENT.?PACKAGE/.test(s))return'packageIndex';
  if(/QR/.test(s))return'qrValue';
  if(/BARCODE/.test(s))return'sku';
  if(/MEAS|DIMENSION|LENGTH|WIDTH|HEIGHT/.test(s))return'__packageMeas';
  return'';
}

export function issueCellHintV30(row={},issue={}){const field=fieldFromPreflightIssueV30(issue);if(!field)return'';return String(row?.__canonicalLineage?.[field]||'');}

export function buildImportReviewRowsV30(state,{preflightSummary=null}={}){
  const summary=preflightSummary||summarizeBatchPreflight(state),rows=state?.batch?.rows||[];
  return(summary?.results||[]).map((result,index)=>{const row=rows[result.index]||{},issues=(result.errors||[]).map(issue=>({...issue,field:fieldFromPreflightIssueV30(issue),cell:issueCellHintV30(row,issue)}));return{index:result.index??index,sourceRow:row.__row||index+1,sku:text(result.sku||row.SKU||row.sku),status:result.ok?'passed':'failed',warningCount:Number(result.warningCount)||0,errorCount:Number(result.errorCount)||issues.length,issues,row};});
}

export function filterImportReviewRowsV30(rows=[],{status='all',query='',sort='source-asc'}={}){
  let out=[...(rows||[])],q=text(query).toLowerCase();
  if(status==='failed'||status==='passed')out=out.filter(r=>r.status===status);
  if(q)out=out.filter(r=>`${r.sourceRow} ${r.sku} ${(r.issues||[]).map(i=>`${i.code||''} ${i.title||''} ${i.cell||''}`).join(' ')}`.toLowerCase().includes(q));
  if(sort==='source-desc')out.sort((a,b)=>Number(b.sourceRow)-Number(a.sourceRow));
  else if(sort==='sku')out.sort((a,b)=>String(a.sku).localeCompare(String(b.sku))||Number(a.sourceRow)-Number(b.sourceRow));
  else if(sort==='status')out.sort((a,b)=>String(a.status).localeCompare(String(b.status))||Number(a.sourceRow)-Number(b.sourceRow));
  else out.sort((a,b)=>Number(a.sourceRow)-Number(b.sourceRow));
  return out;
}
