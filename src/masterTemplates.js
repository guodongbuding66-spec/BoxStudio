const TEMPLATE_SCHEMA_VERSION = 2;
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2]);
const DEFAULT_PRESERVE_KEYS = ['sku','nw','gw','length','width','height','crn','contractNo','packageIndex','packageCount','qrValue'];

function nowIso(){ return new Date().toISOString(); }
function clone(value){ return structuredClone(value); }

function snapshotWithoutHistory(template){
  const copy = clone(template || {});
  delete copy.versions;
  return copy;
}

export function normalizeMasterTemplate(template) {
  const source = clone(template || {});
  if (source.schemaVersion === 1) source.schemaVersion = TEMPLATE_SCHEMA_VERSION;
  source.revision = Math.max(1, Number(source.revision) || 1);
  source.createdAt = source.createdAt || nowIso();
  source.updatedAt = source.updatedAt || source.createdAt;
  source.versions = Array.isArray(source.versions) ? source.versions.map(v => ({ ...clone(v), schemaVersion:TEMPLATE_SCHEMA_VERSION })) : [];
  source.variableDefaults = source.variableDefaults && typeof source.variableDefaults === 'object' ? source.variableDefaults : {};
  return source;
}

export function createMasterTemplate(state, {
  id = `master-${Date.now()}`,
  label = state?.projectName || 'Untitled Master Template',
  description = '',
  preserveVariableKeys = DEFAULT_PRESERVE_KEYS,
} = {}) {
  const source = clone(state || {});
  const variableDefaults = {};
  const preserve = new Set(preserveVariableKeys);
  for (const [key, value] of Object.entries(source.variables || {})) {
    if (!preserve.has(key)) variableDefaults[key] = value;
  }
  const createdAt = nowIso();
  return {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    id,
    label,
    description,
    revision: 1,
    revisionNote: 'Initial snapshot',
    createdAt,
    updatedAt: createdAt,
    parentId: null,
    customerProfileId: source.customerProfileId || 'generic',
    packagingRuleProfileId: source.packagingRuleProfileId || 'generic',
    markTemplateId: source.markTemplateId || null,
    structure: clone(source.structure || {}),
    elements: clone(source.elements || []),
    exportOptions: clone(source.exportOptions || {}),
    lockedGroups: clone(source.lockedGroups || {}),
    lockedVariables: clone(source.lockedVariables || []),
    variableDefaults,
    versions: [],
  };
}

export function validateMasterTemplate(template) {
  const issues = [];
  if (!template || typeof template !== 'object') return { ok:false, issues:['Template is not an object.'] };
  if (!SUPPORTED_SCHEMA_VERSIONS.has(Number(template.schemaVersion))) issues.push(`Unsupported schemaVersion: ${template.schemaVersion}`);
  if (!template.id) issues.push('Missing template id.');
  if (!template.label) issues.push('Missing template label.');
  if (!template.structure || typeof template.structure !== 'object') issues.push('Missing structure.');
  if (!Array.isArray(template.elements)) issues.push('Elements must be an array.');
  if (template.versions != null && !Array.isArray(template.versions)) issues.push('Versions must be an array.');
  return { ok: issues.length === 0, issues };
}

export function renameMasterTemplate(template, label) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  const next = normalizeMasterTemplate(template);
  const clean = String(label || '').trim();
  if (!clean) throw new Error('Master template name cannot be empty.');
  next.label = clean;
  next.updatedAt = nowIso();
  return next;
}

export function duplicateMasterTemplate(template, {
  id = `master-${Date.now()}`,
  label = `${template?.label || 'Master Template'} Copy`,
} = {}) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  const source = normalizeMasterTemplate(template);
  const createdAt = nowIso();
  const copy = snapshotWithoutHistory(source);
  return {
    ...copy,
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    id,
    label: String(label || '').trim() || `${source.label} Copy`,
    revision: 1,
    revisionNote: `Duplicated from ${source.id} r${source.revision}`,
    createdAt,
    updatedAt: createdAt,
    parentId: source.id,
    versions: [],
  };
}

export function createMasterRevision(template, state, { note = '' } = {}) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  const current = normalizeMasterTemplate(template);
  const previousSnapshot = {
    ...snapshotWithoutHistory(current),
    archivedAt: nowIso(),
  };
  const fresh = createMasterTemplate(state, {
    id: current.id,
    label: current.label,
    description: current.description || '',
  });
  fresh.revision = current.revision + 1;
  fresh.revisionNote = String(note || '').trim() || `Revision ${fresh.revision}`;
  fresh.createdAt = current.createdAt;
  fresh.updatedAt = nowIso();
  fresh.parentId = current.parentId || null;
  fresh.versions = [...(current.versions || []), previousSnapshot];
  return fresh;
}

export function listMasterRevisions(template) {
  const current = normalizeMasterTemplate(template);
  const archived = (current.versions || []).map(v => ({
    revision: Math.max(1, Number(v.revision) || 1),
    label: v.label || current.label,
    revisionNote: v.revisionNote || '',
    updatedAt: v.updatedAt || v.createdAt || '',
    current: false,
  }));
  return [...archived, {
    revision: current.revision,
    label: current.label,
    revisionNote: current.revisionNote || '',
    updatedAt: current.updatedAt || current.createdAt || '',
    current: true,
  }].sort((a,b)=>b.revision-a.revision);
}

export function restoreMasterRevision(template, revision) {
  const current = normalizeMasterTemplate(template);
  const targetRevision = Number(revision);
  if (targetRevision === current.revision) return current;
  const archived = (current.versions || []).find(v => Number(v.revision) === targetRevision);
  if (!archived) throw new Error(`Revision ${revision} was not found.`);
  const currentSnapshot = { ...snapshotWithoutHistory(current), archivedAt: nowIso() };
  const restored = {
    ...clone(archived),
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    id: current.id,
    label: current.label,
    revision: current.revision + 1,
    revisionNote: `Restored from revision ${targetRevision}`,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
    parentId: current.parentId || null,
    versions: [...(current.versions || []), currentSnapshot],
    restoredFromRevision: targetRevision,
  };
  delete restored.archivedAt;
  return restored;
}

export function applyMasterTemplate(state, template, { preserveVariables = true } = {}) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  const normalized = normalizeMasterTemplate(template);
  const next = clone(state || {});
  const previousVariables = clone(next.variables || {});
  next.structure = clone(normalized.structure);
  next.elements = clone(normalized.elements);
  next.exportOptions = clone(normalized.exportOptions || next.exportOptions || {});
  next.lockedGroups = clone(normalized.lockedGroups || {});
  next.lockedVariables = clone(normalized.lockedVariables || []);
  next.customerProfileId = normalized.customerProfileId || 'generic';
  next.packagingRuleProfileId = normalized.packagingRuleProfileId || 'generic';
  next.markTemplateId = normalized.markTemplateId || null;
  next.variables = {
    ...(normalized.variableDefaults || {}),
    ...(preserveVariables ? previousVariables : {}),
  };
  next.selectedId = next.elements[0]?.id || null;
  return next;
}

export function serializeMasterTemplate(template) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  return JSON.stringify(normalizeMasterTemplate(template), null, 2);
}

export function parseMasterTemplate(text) {
  const parsed = JSON.parse(text);
  const validation = validateMasterTemplate(parsed);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  return normalizeMasterTemplate(parsed);
}
