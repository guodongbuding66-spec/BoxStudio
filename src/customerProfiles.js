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

function slug(value='custom-customer'){
  const out=String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return out || `custom-customer-${Date.now()}`;
}
function uniqueStrings(values=[]){
  return Array.from(new Set((Array.isArray(values)?values:String(values||'').split(',')).map(v=>String(v).trim()).filter(Boolean)));
}

export function normalizeCustomerProfile(profile={}) {
  return {
    id: slug(profile.id || profile.label || 'custom-customer'),
    label: String(profile.label || profile.id || 'Custom Customer').trim(),
    packagingRuleProfileId: String(profile.packagingRuleProfileId || 'generic'),
    defaultVariables: profile.defaultVariables && typeof profile.defaultVariables === 'object' ? { ...profile.defaultVariables } : {},
    lockedVariables: uniqueStrings(profile.lockedVariables || []),
    preferredMarkTemplateId: profile.preferredMarkTemplateId || null,
    custom: true,
  };
}

export function getCustomerProfileCatalog(state=null) {
  return { ...CUSTOMER_PROFILES, ...((state?.customCustomerProfiles && typeof state.customCustomerProfiles === 'object') ? state.customCustomerProfiles : {}) };
}

export function getCustomerProfile(id = 'generic', state=null) {
  const catalog = getCustomerProfileCatalog(state);
  return catalog[id] || CUSTOMER_PROFILES.generic;
}

export function saveCustomCustomerProfile(state, profile) {
  const next = structuredClone(state || {});
  const normalized = normalizeCustomerProfile(profile);
  if (CUSTOMER_PROFILES[normalized.id]) throw new Error('Built-in customer profiles cannot be overwritten.');
  next.customCustomerProfiles = { ...(next.customCustomerProfiles || {}), [normalized.id]: normalized };
  return next;
}

export function deleteCustomCustomerProfile(state, id) {
  if (CUSTOMER_PROFILES[id]) throw new Error('Built-in customer profiles cannot be deleted.');
  const next = structuredClone(state || {});
  const profiles = { ...(next.customCustomerProfiles || {}) };
  delete profiles[id];
  next.customCustomerProfiles = profiles;
  if (next.customerProfileId === id) next.customerProfileId = 'generic';
  return next;
}

export function applyCustomerProfile(state, profileId, { overwriteDefaults = false } = {}) {
  const profile = getCustomerProfile(profileId, state);
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
  const profile = getCustomerProfile(state?.customerProfileId || 'generic', state);
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
