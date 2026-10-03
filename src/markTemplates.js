export const MARK_TEMPLATES = Object.freeze({
  'us-side-seal-master': Object.freeze({
    id: 'us-side-seal-master',
    label: 'US Side-Seal Master Marks',
    description: 'US export shipping-mark layout with repeated CRN and locked barcode/QR group.',
    elementIds: Object.freeze(['sku','weight','measure','crn1','contract','origin','dest','crn2','barcodeQr','packageNotice','thisSideUp','fragile','keepDry']),
    barcodeQrPreset: '250x80',
  }),
  'us-side-seal-compact': Object.freeze({
    id: 'us-side-seal-compact',
    label: 'US Side-Seal Compact Marks',
    description: 'Compact barcode/QR group for restricted side-panel space.',
    elementIds: Object.freeze(['sku','weight','measure','crn1','contract','origin','dest','crn2','barcodeQr','packageNotice','thisSideUp','fragile','keepDry']),
    barcodeQrPreset: '200x64',
  }),
});

export function getMarkTemplate(id = 'us-side-seal-master') {
  return MARK_TEMPLATES[id] || MARK_TEMPLATES['us-side-seal-master'];
}

export function applyMarkTemplate(state, templateId) {
  const template = getMarkTemplate(templateId);
  const next = structuredClone(state);
  next.markTemplateId = template.id;
  const group = (next.elements || []).find(element => element?.type === 'barcode-qr-group');
  if (group) {
    const [w, h] = template.barcodeQrPreset.split('x').map(Number);
    group.preset = template.barcodeQrPreset;
    group.w = w;
    group.h = h;
    group.lockAspect = true;
  }
  return next;
}

export function validateMarkTemplate(state) {
  const template = getMarkTemplate(state?.markTemplateId || 'us-side-seal-master');
  const ids = new Set((state?.elements || []).map(element => element?.id));
  const missing = template.elementIds.filter(id => !ids.has(id));
  const group = (state?.elements || []).find(element => element?.type === 'barcode-qr-group');
  const presetOk = !group || group.preset === template.barcodeQrPreset;
  return {
    ok: missing.length === 0 && presetOk,
    template,
    missing,
    presetOk,
  };
}
