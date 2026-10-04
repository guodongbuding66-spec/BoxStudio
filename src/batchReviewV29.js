import { summarizeBatchPreflight } from './batchTemplates.js';
import { importDiagnosticsSummaryV29 } from './batchImportV29.js';

const csvCell=value=>{const s=String(value??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};

export function activeBatchSheetV29(state){const sheets=state?.batch?.sheets||[],index=Math.max(0,Math.min(sheets.length-1,Number(state?.batch?.sheetIndex)||0));return sheets[index]||null;}

export function batchImportReviewV29(state,{preflightSummary=null}={}){
  const sheet=activeBatchSheetV29(state),summary=preflightSummary||summarizeBatchPreflight(state);
  return{
    fileName:String(state?.batch?.fileName||''),
    sheetName:String(sheet?.name||''),
    diagnostics:importDiagnosticsSummaryV29(sheet||{}),
    formulaWarnings:[...(sheet?.importDiagnostics?.formulaWarnings||[])],
    preflight:summary,
  };
}

export function failedRowsCsvV29(state,{preflightSummary=null}={}){
  const summary=preflightSummary||summarizeBatchPreflight(state),headers=[...(state?.batch?.columns||[])],rows=state?.batch?.rows||[],failed=(summary?.results||[]).filter(r=>!r.ok);
  if(!failed.length)return'';
  const out=[['Source Row','SKU','Error Codes','Errors','Cell Lineage',...headers].map(csvCell).join(',')];
  for(const result of failed){const row=rows[result.index]||{},codes=(result.errors||[]).map(e=>e.code||'').filter(Boolean).join(' | '),errors=(result.errors||[]).map(e=>e.title||e.detail||'Error').join(' | '),lineage=JSON.stringify(row.__canonicalLineage||{});out.push([row.__row||result.index+1,result.sku||row.SKU||'',codes,errors,lineage,...headers.map(h=>row[h]??'')].map(csvCell).join(','));}
  return out.join('\r\n')+'\r\n';
}

export function batchDiagnosticsJsonV29(state,{preflightSummary=null}={}){return JSON.stringify(batchImportReviewV29(state,{preflightSummary}),null,2);}
