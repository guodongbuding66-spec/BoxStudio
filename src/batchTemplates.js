import { applyMasterTemplate } from './masterTemplates.js';
import { rowToVariables, autoMapHeaders } from './batch.js';
import { normalizeVariables } from './variables.js';
import { runPreflight } from './preflightV31.js';

function clone(value){ return structuredClone(value); }

export function resolveBatchMaster(state){
  const id = state?.batch?.masterTemplateId;
  if(!id) return null;
  return (state?.masterTemplates || []).find(template => template?.id === id) || null;
}

export function buildBatchState(baseState, row, {
  headers = baseState?.batch?.columns || [],
  mapping = baseState?.batch?.mapping || autoMapHeaders(headers),
  masterTemplate = resolveBatchMaster(baseState),
  preserveVariables = true,
} = {}) {
  const base = clone(baseState || {});
  let next = masterTemplate ? applyMasterTemplate(base, masterTemplate, { preserveVariables }) : base;
  next.variables = normalizeVariables(rowToVariables(row || {}, headers, mapping, next.variables || {}));
  next.batch = { ...(base.batch || {}), ...(next.batch || {}) };
  if(masterTemplate) next.batch.masterTemplateId = masterTemplate.id;
  return next;
}

export function buildBatchStates(baseState, rows = baseState?.batch?.rows || [], options = {}) {
  return rows.map(row => buildBatchState(baseState, row, options));
}

export function summarizeBatchPreflight(baseState, rows = baseState?.batch?.rows || [], options = {}) {
  const pages = buildBatchStates(baseState, rows, options);
  const results = pages.map((state,index) => {
    const checks = runPreflight(state);
    const errors = checks.filter(check => check.severity === 'error');
    const warnings = checks.filter(check => check.severity === 'warning');
    return {
      index,
      sku: String(state.variables?.sku || ''),
      packageIndex: String(state.variables?.packageIndex || ''),
      packageCount: String(state.variables?.packageCount || ''),
      ok: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.map(check => ({ title:check.title, detail:check.detail, code:check.code || '' })),
    };
  });
  return {
    total: results.length,
    passed: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    warnings: results.reduce((sum,result)=>sum+result.warningCount,0),
    results,
  };
}
