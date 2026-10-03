export const CUSTOMER_PROFILES = Object.freeze({
  generic: Object.freeze({
    id: 'generic',
    label: 'Generic Customer',
    packagingRuleProfileId: 'generic',
    defaultVariables: Object.freeze({}),
    lockedVariables: Object.freeze([]),
    preferredMarkTemplateId: null,
  }),
  'us-export-master': Object.freeze({
    id: 'us-export-master',
    label: 'US Export Master',
    packagingRuleProfileId: 'us-side-seal',
    defaultVariables: Object.freeze({
      originCountry: 'China',
      destinationCountry: 'US',
      dimensionUnit: 'INCH',
      weightUnit: 'LBS',
    }),
    lockedVariables: Object.freeze(['originCountry', 'destinationCountry', 'dimensionUnit', 'weightUnit']),
    preferredMarkTemplateId: 'us-side-seal-master',
  }),
});

export function getCustomerProfile(id = 'generic') {
  return CUSTOMER_PROFILES[id] || CUSTOMER_PROFILES.generic;
}

export function applyCustomerProfile(state, profileId, { overwriteDefaults = false } = {}) {
  const profile = getCustomerProfile(profileId);
  const next = structuredClone(state);
  next.customerProfileId = profile.id;
  next.packagingRuleProfileId = profile.packagingRuleProfileId;
  next.markTemplateId = profile.preferredMarkTemplateId || next.markTemplateId || null;
  next.variables = { ...(next.variables || {}) };

  for (const [key, value] of Object.entries(profile.defaultVariables || {})) {
    if (overwriteDefaults || next.variables[key] == null || next.variables[key] === '') next.variables[key] = value;
  }
  next.lockedVariables = Array.from(new Set([...(next.lockedVariables || []), ...(profile.lockedVariables || [])]));
  return next;
}

export function validateCustomerProfile(state) {
  const profile = getCustomerProfile(state?.customerProfileId || 'generic');
  const issues = [];
  if ((state?.packagingRuleProfileId || 'generic') !== profile.packagingRuleProfileId) {
    issues.push(`Packaging rule profile should be ${profile.packagingRuleProfileId}.`);
  }
  for (const key of profile.lockedVariables || []) {
    const expected = profile.defaultVariables?.[key];
    if (expected != null && String(state?.variables?.[key] ?? '') !== String(expected)) {
      issues.push(`${key} should remain ${expected}.`);
    }
  }
  return { ok: issues.length === 0, profile, issues };
}
