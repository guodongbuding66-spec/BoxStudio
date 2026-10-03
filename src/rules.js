export const PACKAGING_RULE_PROFILES = Object.freeze({
  generic: Object.freeze({
    id: 'generic',
    label: 'Generic Packaging',
    requiredVariables: ['sku'],
    requireOrigin: false,
    requireDestination: false,
    requireCrnBindings: 0,
    packageNoticeWhenMultiple: true,
    fixedVariables: Object.freeze({}),
    barcodeQr: Object.freeze({
      required: false,
      allowedPresets: ['250x80', '200x64'],
      ratio: 3.125,
      ratioTolerance: 0.03,
      requireLockAspect: false,
    }),
  }),
  'us-side-seal': Object.freeze({
    id: 'us-side-seal',
    label: 'US Side-Seal Carton',
    requiredVariables: ['sku', 'nw', 'gw', 'crn', 'contractNo', 'originCountry', 'destinationCountry'],
    requireOrigin: true,
    requireDestination: true,
    requireCrnBindings: 2,
    packageNoticeWhenMultiple: true,
    fixedVariables: Object.freeze({}),
    barcodeQr: Object.freeze({
      required: true,
      allowedPresets: ['250x80', '200x64'],
      ratio: 3.125,
      ratioTolerance: 0.03,
      requireLockAspect: true,
    }),
  }),
});

const DEFAULT_BARCODE_QR = Object.freeze({
  required:false,
  allowedPresets:['250x80','200x64'],
  ratio:3.125,
  ratioTolerance:0.03,
  requireLockAspect:false,
});

function slug(value='custom-rule'){
  const out = String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return out || `custom-rule-${Date.now()}`;
}

function uniqueStrings(values=[]){
  return Array.from(new Set((Array.isArray(values)?values:String(values||'').split(',')).map(v=>String(v).trim()).filter(Boolean)));
}

export function normalizePackagingRuleProfile(profile={}) {
  const barcodeQr = { ...DEFAULT_BARCODE_QR, ...(profile.barcodeQr || {}) };
  barcodeQr.allowedPresets = uniqueStrings(barcodeQr.allowedPresets?.length ? barcodeQr.allowedPresets : DEFAULT_BARCODE_QR.allowedPresets);
  barcodeQr.ratio = Number(barcodeQr.ratio) > 0 ? Number(barcodeQr.ratio) : 3.125;
  barcodeQr.ratioTolerance = Number(barcodeQr.ratioTolerance) >= 0 ? Number(barcodeQr.ratioTolerance) : 0.03;
  return {
    id: slug(profile.id || profile.label || 'custom-rule'),
    label: String(profile.label || profile.id || 'Custom Packaging Rule').trim(),
    requiredVariables: uniqueStrings(profile.requiredVariables || []),
    requireOrigin: Boolean(profile.requireOrigin),
    requireDestination: Boolean(profile.requireDestination),
    requireCrnBindings: Math.max(0, Math.floor(Number(profile.requireCrnBindings) || 0)),
    packageNoticeWhenMultiple: profile.packageNoticeWhenMultiple !== false,
    fixedVariables: profile.fixedVariables && typeof profile.fixedVariables === 'object' ? { ...profile.fixedVariables } : {},
    barcodeQr,
    custom: true,
  };
}

export function getPackagingRuleCatalog(state=null) {
  return { ...PACKAGING_RULE_PROFILES, ...((state?.customPackagingRules && typeof state.customPackagingRules === 'object') ? state.customPackagingRules : {}) };
}

export function getPackagingRuleProfile(id = 'generic', state=null) {
  const catalog = getPackagingRuleCatalog(state);
  return catalog[id] || PACKAGING_RULE_PROFILES.generic;
}

export function saveCustomPackagingRule(state, profile) {
  const next = structuredClone(state || {});
  const normalized = normalizePackagingRuleProfile(profile);
  if (PACKAGING_RULE_PROFILES[normalized.id]) throw new Error('Built-in packaging rules cannot be overwritten.');
  next.customPackagingRules = { ...(next.customPackagingRules || {}), [normalized.id]: normalized };
  return next;
}

export function deleteCustomPackagingRule(state, id) {
  if (PACKAGING_RULE_PROFILES[id]) throw new Error('Built-in packaging rules cannot be deleted.');
  const next = structuredClone(state || {});
  const rules = { ...(next.customPackagingRules || {}) };
  delete rules[id];
  next.customPackagingRules = rules;
  if (next.packagingRuleProfileId === id) next.packagingRuleProfileId = 'generic';
  return next;
}

function renderedTemplate(element, variables) {
  return String(element?.template || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => String(variables?.[key] ?? ''));
}

export function countVariableBindings(elements = [], variableName) {
  const needle = new RegExp(`{{\\s*${variableName}\\s*}}`, 'i');
  return elements.filter(element => needle.test(String(element?.template || ''))).length;
}

export function validatePackagingRuleState(state, profileId = state?.packagingRuleProfileId || 'generic') {
  const profile = getPackagingRuleProfile(profileId, state);
  const variables = state?.variables || {};
  const elements = Array.isArray(state?.elements) ? state.elements : [];
  const checks = [];

  for (const key of profile.requiredVariables || []) {
    const value = String(variables[key] ?? '').trim();
    checks.push({
      severity: value ? 'pass' : 'error',
      title: `Rule · ${key}`,
      detail: value ? value : `Required by ${profile.label}`,
      code: `rule.required.${key}`,
    });
  }

  for (const [key, expected] of Object.entries(profile.fixedVariables || {})) {
    const actual = String(variables[key] ?? '');
    const ok = actual === String(expected);
    checks.push({
      severity: ok ? 'pass' : 'error',
      title: `Rule · fixed ${key}`,
      detail: ok ? actual : `Expected ${expected}; got ${actual || '(empty)'}`,
      code: `rule.fixed.${key}`,
    });
  }

  const packageCount = Number(variables.packageCount || 1);
  const packageIndex = Number(variables.packageIndex || 1);
  const packageOk = Number.isFinite(packageCount) && Number.isFinite(packageIndex) && packageCount >= 1 && packageIndex >= 1 && packageIndex <= packageCount;
  checks.push({
    severity: packageOk ? 'pass' : 'error',
    title: 'Rule · Package index/count',
    detail: packageOk ? `${packageIndex}/${packageCount}` : `Invalid package index/count: ${packageIndex}/${packageCount}`,
    code: 'rule.package.index',
  });

  if (profile.packageNoticeWhenMultiple && packageCount > 1) {
    const notice = elements.find(element => element?.id === 'packageNotice' || element?.type === 'notice');
    const visibleText = renderedTemplate(notice, variables).trim();
    checks.push({
      severity: notice && visibleText ? 'pass' : 'error',
      title: 'Rule · Multi-package notice',
      detail: notice && visibleText ? visibleText.replace(/\n/g, ' / ') : 'Multiple packages require a package notice element.',
      code: 'rule.package.notice',
    });
  }

  if (profile.requireCrnBindings > 0) {
    const bindings = countVariableBindings(elements, 'crn');
    checks.push({
      severity: bindings >= profile.requireCrnBindings ? 'pass' : 'error',
      title: 'Rule · CRN repeated binding',
      detail: `${bindings} binding(s); minimum ${profile.requireCrnBindings}`,
      code: 'rule.crn.bindings',
    });
  }

  const group = elements.find(element => element?.type === 'barcode-qr-group');
  if (profile.barcodeQr?.required && !group) {
    checks.push({ severity: 'error', title:'Rule · Barcode + QR group', detail:'Missing required locked group.', code:'rule.barcodeQr.missing' });
  } else if (group) {
    const settings = { ...DEFAULT_BARCODE_QR, ...(profile.barcodeQr || {}) };
    const width = Number(group.w);
    const height = Number(group.h);
    const ratio = height > 0 ? width / height : 0;
    const ratioOk = Math.abs(ratio - settings.ratio) <= settings.ratioTolerance;
    const presetOk = !group.preset || settings.allowedPresets.includes(group.preset);
    const lockOk = !settings.requireLockAspect || group.lockAspect === true;
    checks.push({ severity:ratioOk?'pass':'error', title:'Rule · Barcode + QR ratio', detail:`${width}×${height} mm · ratio ${ratio.toFixed(3)}`, code:'rule.barcodeQr.ratio' });
    checks.push({ severity:presetOk?'pass':'warning', title:'Rule · Barcode + QR preset', detail:group.preset || 'custom size', code:'rule.barcodeQr.preset' });
    checks.push({ severity:lockOk?'pass':'error', title:'Rule · Barcode + QR aspect lock', detail:lockOk?'Aspect lock enabled.':'Aspect lock is required.', code:'rule.barcodeQr.lock' });
  }

  checks.unshift({
    severity: 'pass',
    title: 'Packaging Rule Profile',
    detail: `${profile.label}${profile.custom ? ' · custom' : ''}`,
    code: 'rule.profile',
  });

  return checks;
}
