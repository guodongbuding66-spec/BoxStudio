import { V32_TEMPLATE_CATALOG, searchTemplateCatalogV32, templateCatalogByIdV32 } from './parametricTemplatesV32.js';

export const TEMPLATE_SCHEMA_VERSION = 2;

// The current core catalog intentionally contains only templates with a real geometry path.
// Additional FEFCO/ECMA namespaces remain future catalog work; schema-only cards are not shown as usable templates.
export const STANDARD_TEMPLATE_CATALOG = V32_TEMPLATE_CATALOG.map(t=>({
  ...t,
  engine:t.id,
  parameters:[...t.parameters],
}));

export const TEMPLATE_RECORD_EXAMPLE = {
  schemaVersion:TEMPLATE_SCHEMA_VERSION,
  standard:'FEFCO|ECMA|CUSTOM',
  code:'string',
  revision:'string|null',
  units:'mm',
  category:'shipping|mailer|folding-carton|tray|rigid|custom',
  parameters:[],
  rules:[],
  geometryGenerator:'module/function',
  validation:[],
  metadata:{source:'user/admin/core',approved:false,realSampleAccepted:false},
};

export function templateCatalogById(id){return templateCatalogByIdV32(id);}
export function searchTemplateCatalog(filters={}){return searchTemplateCatalogV32(filters);}
