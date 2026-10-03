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

function slug(value='custom-marks'){
  const out=String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return out || `custom-marks-${Date.now()}`;
}

export function normalizeMarkTemplate(template={}){
  const elements=Array.isArray(template.elements)?structuredClone(template.elements):null;
  const elementIds=Array.isArray(template.elementIds)?Array.from(new Set(template.elementIds.map(String))):(elements?elements.map(e=>e.id).filter(Boolean):[]);
  return {
    id:slug(template.id||template.label||'custom-marks'),
    label:String(template.label||template.id||'Custom Mark Template').trim(),
    description:String(template.description||''),
    elementIds,
    barcodeQrPreset:String(template.barcodeQrPreset||'250x80'),
    elements,
    custom:true,
    createdAt:template.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString(),
  };
}

export function getMarkTemplateCatalog(state=null){
  return { ...MARK_TEMPLATES, ...((state?.customMarkTemplates&&typeof state.customMarkTemplates==='object')?state.customMarkTemplates:{}) };
}

export function getMarkTemplate(id = 'us-side-seal-master', state=null) {
  const catalog=getMarkTemplateCatalog(state);
  return catalog[id] || MARK_TEMPLATES['us-side-seal-master'];
}

export function createMarkTemplateFromState(state,{id,label,description=''}={}){
  const marks=(state?.elements||[]).filter(element=>element?.group==='marks').map(element=>structuredClone(element));
  const group=marks.find(element=>element?.type==='barcode-qr-group');
  return normalizeMarkTemplate({
    id:id||label||`custom-marks-${Date.now()}`,
    label:label||state?.projectName||'Custom Mark Template',
    description,
    elements:marks,
    barcodeQrPreset:group?.preset||`${group?.w||250}x${group?.h||80}`,
  });
}

export function saveCustomMarkTemplate(state,template){
  const next=structuredClone(state||{});
  const normalized=normalizeMarkTemplate(template);
  if(MARK_TEMPLATES[normalized.id]) throw new Error('Built-in mark templates cannot be overwritten.');
  next.customMarkTemplates={...(next.customMarkTemplates||{}),[normalized.id]:normalized};
  return next;
}

export function deleteCustomMarkTemplate(state,id){
  if(MARK_TEMPLATES[id]) throw new Error('Built-in mark templates cannot be deleted.');
  const next=structuredClone(state||{}),templates={...(next.customMarkTemplates||{})};
  delete templates[id];next.customMarkTemplates=templates;
  if(next.markTemplateId===id) next.markTemplateId='us-side-seal-master';
  return next;
}

export function applyMarkTemplate(state, templateId) {
  const template = getMarkTemplate(templateId,state);
  const next = structuredClone(state);
  next.markTemplateId = template.id;
  if(Array.isArray(template.elements)){
    const nonMarks=(next.elements||[]).filter(element=>element?.group!=='marks');
    next.elements=[...nonMarks,...structuredClone(template.elements)];
  }
  const group = (next.elements || []).find(element => element?.type === 'barcode-qr-group');
  if (group && template.barcodeQrPreset) {
    const [w, h] = template.barcodeQrPreset.split('x').map(Number);
    if(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0){group.preset = template.barcodeQrPreset;group.w = w;group.h = h;}
    group.lockAspect = true;
  }
  return next;
}

export function validateMarkTemplate(state) {
  const template = getMarkTemplate(state?.markTemplateId || 'us-side-seal-master',state);
  const ids = new Set((state?.elements || []).map(element => element?.id));
  const missing = (template.elementIds||[]).filter(id => !ids.has(id));
  const group = (state?.elements || []).find(element => element?.type === 'barcode-qr-group');
  const presetOk = !group || !template.barcodeQrPreset || group.preset === template.barcodeQrPreset;
  return {
    ok: missing.length === 0 && presetOk,
    template,
    missing,
    presetOk,
  };
}
