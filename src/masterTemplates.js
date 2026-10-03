const TEMPLATE_SCHEMA_VERSION = 1;

export function createMasterTemplate(state, {
  id = `master-${Date.now()}`,
  label = state?.projectName || 'Untitled Master Template',
  description = '',
  preserveVariableKeys = ['sku','nw','gw','length','width','height','crn','contractNo','packageIndex','packageCount','qrValue'],
} = {}) {
  const source = structuredClone(state || {});
  const variableDefaults = {};
  const preserve = new Set(preserveVariableKeys);
  for (const [key, value] of Object.entries(source.variables || {})) {
    if (!preserve.has(key)) variableDefaults[key] = value;
  }
  return {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    id,
    label,
    description,
    createdAt: new Date().toISOString(),
    customerProfileId: source.customerProfileId || 'generic',
    packagingRuleProfileId: source.packagingRuleProfileId || 'generic',
    markTemplateId: source.markTemplateId || null,
    structure: structuredClone(source.structure || {}),
    elements: structuredClone(source.elements || []),
    exportOptions: structuredClone(source.exportOptions || {}),
    lockedGroups: structuredClone(source.lockedGroups || {}),
    lockedVariables: structuredClone(source.lockedVariables || []),
    variableDefaults,
  };
}

export function validateMasterTemplate(template) {
  const issues = [];
  if (!template || typeof template !== 'object') return { ok:false, issues:['Template is not an object.'] };
  if (template.schemaVersion !== TEMPLATE_SCHEMA_VERSION) issues.push(`Unsupported schemaVersion: ${template.schemaVersion}`);
  if (!template.id) issues.push('Missing template id.');
  if (!template.label) issues.push('Missing template label.');
  if (!template.structure || typeof template.structure !== 'object') issues.push('Missing structure.');
  if (!Array.isArray(template.elements)) issues.push('Elements must be an array.');
  return { ok: issues.length === 0, issues };
}

export function applyMasterTemplate(state, template, { preserveVariables = true } = {}) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  const next = structuredClone(state || {});
  const previousVariables = structuredClone(next.variables || {});
  next.structure = structuredClone(template.structure);
  next.elements = structuredClone(template.elements);
  next.exportOptions = structuredClone(template.exportOptions || next.exportOptions || {});
  next.lockedGroups = structuredClone(template.lockedGroups || {});
  next.lockedVariables = structuredClone(template.lockedVariables || []);
  next.customerProfileId = template.customerProfileId || 'generic';
  next.packagingRuleProfileId = template.packagingRuleProfileId || 'generic';
  next.markTemplateId = template.markTemplateId || null;
  next.variables = {
    ...(template.variableDefaults || {}),
    ...(preserveVariables ? previousVariables : {}),
  };
  next.selectedId = next.elements[0]?.id || null;
  return next;
}

export function serializeMasterTemplate(template) {
  const validation = validateMasterTemplate(template);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  return JSON.stringify(template, null, 2);
}

export function parseMasterTemplate(text) {
  const parsed = JSON.parse(text);
  const validation = validateMasterTemplate(parsed);
  if (!validation.ok) throw new Error(validation.issues.join(' '));
  return parsed;
}
