export const PACKAGING_RULE_PROFILES = Object.freeze({
  generic: Object.freeze({
    id: 'generic',
    label: 'Generic Packaging',
    requiredVariables: ['sku'],
    requireOrigin: false,
    requireDestination: false,
    requireCrnBindings: 0,
    packageNoticeWhenMultiple: true,
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
    barcodeQr: Object.freeze({
      required: true,
      allowedPresets: ['250x80', '200x64'],
      ratio: 3.125,
      ratioTolerance: 0.03,
      requireLockAspect: true,
    }),
  }),
});

export function getPackagingRuleProfile(id = 'generic') {
  return PACKAGING_RULE_PROFILES[id] || PACKAGING_RULE_PROFILES.generic;
}

function renderedTemplate(element, variables) {
  return String(element?.template || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => String(variables?.[key] ?? ''));
}

export function countVariableBindings(elements = [], variableName) {
  const needle = new RegExp(`{{\\s*${variableName}\\s*}}`, 'i');
  return elements.filter(element => needle.test(String(element?.template || ''))).length;
}

export function validatePackagingRuleState(state, profileId = state?.packagingRuleProfileId || 'generic') {
  const profile = getPackagingRuleProfile(profileId);
  const variables = state?.variables || {};
  const elements = Array.isArray(state?.elements) ? state.elements : [];
  const checks = [];

  for (const key of profile.requiredVariables) {
    const value = String(variables[key] ?? '').trim();
    checks.push({
      severity: value ? 'pass' : 'error',
      title: `Rule · ${key}`,
      detail: value ? value : `Required by ${profile.label}`,
      code: `rule.required.${key}`,
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
  if (profile.barcodeQr.required && !group) {
    checks.push({ severity: 'error', title: 'Rule · Barcode + QR group', detail: 'Missing required locked group.', code: 'rule.barcodeQr.missing' });
  } else if (group) {
    const width = Number(group.w);
    const height = Number(group.h);
    const ratio = height > 0 ? width / height : 0;
    const ratioOk = Math.abs(ratio - profile.barcodeQr.ratio) <= profile.barcodeQr.ratioTolerance;
    const presetOk = !group.preset || profile.barcodeQr.allowedPresets.includes(group.preset);
    const lockOk = !profile.barcodeQr.requireLockAspect || group.lockAspect === true;
    checks.push({ severity: ratioOk ? 'pass' : 'error', title: 'Rule · Barcode + QR ratio', detail: `${width}×${height} mm · ratio ${ratio.toFixed(3)}`, code: 'rule.barcodeQr.ratio' });
    checks.push({ severity: presetOk ? 'pass' : 'warning', title: 'Rule · Barcode + QR preset', detail: group.preset || 'custom size', code: 'rule.barcodeQr.preset' });
    checks.push({ severity: lockOk ? 'pass' : 'error', title: 'Rule · Barcode + QR aspect lock', detail: lockOk ? 'Aspect lock enabled.' : 'Aspect lock is required.', code: 'rule.barcodeQr.lock' });
  }

  checks.unshift({
    severity: 'pass',
    title: 'Packaging Rule Profile',
    detail: profile.label,
    code: 'rule.profile',
  });

  return checks;
}
