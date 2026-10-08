import {V71_TEMPLATE_CATALOG,searchTemplateCatalogV71,templateCatalogByIdV71} from './parametricTemplatesV71.js';
import { V32_TEMPLATE_CATALOG, searchTemplateCatalogV32, templateCatalogByIdV32 } from './parametricTemplatesV32.js';
import { V48_TEMPLATE_CATALOG, searchTemplateCatalogV48, templateCatalogByIdV48 } from './parametricTemplatesV48.js';

export const TEMPLATE_SCHEMA_VERSION = 3;

const SCHEMA_NAMESPACES=[
  {id:'fefco-04xx-schema',category:'namespace',standard:'FEFCO',code:'04xx',name:'Folder-type family schema',nameZh:'FEFCO 04xx 结构命名空间',engine:null,status:'schema-only',parameters:['length','width','height','thickness'],tags:['fefco','04xx','namespace']},
  {id:'ecma-schema',category:'namespace',standard:'ECMA',code:'—',name:'ECMA folding-carton schema namespace',nameZh:'ECMA 折叠纸盒命名空间',engine:null,status:'schema-only',parameters:['A','B','H','caliper','boardGrade'],tags:['ecma','folding carton','namespace']},
];

// Only records backed by a real geometry path are actionable. Schema-only namespaces stay discoverable but never masquerade as working templates.
export const STANDARD_TEMPLATE_CATALOG = [
  ...V32_TEMPLATE_CATALOG.map(t=>({...t,engine:t.id,parameters:[...t.parameters]})),
  ...V48_TEMPLATE_CATALOG.map(t=>({...t,engine:t.id,parameters:[...t.parameters]})),
  ...V71_TEMPLATE_CATALOG,
  ...SCHEMA_NAMESPACES,
];

export const TEMPLATE_RECORD_EXAMPLE = {
  schemaVersion:TEMPLATE_SCHEMA_VERSION,
  standard:'FEFCO|ECMA|CUSTOM',
  code:'string',
  revision:'string|null',
  units:'mm',
  category:'shipping|mailer|folding-carton|sleeve|tray|rigid|custom|namespace',
  parameters:[],
  rules:[],
  geometryGenerator:'module/function|null',
  validation:[],
  metadata:{source:'user/admin/core',approved:false,realSampleAccepted:false},
};

export function templateCatalogById(id){return templateCatalogByIdV32(id)||templateCatalogByIdV48(id)||templateCatalogByIdV71(id)||SCHEMA_NAMESPACES.find(t=>t.id===id)||null;}
export function searchTemplateCatalog(filters={}){
  const core=[...searchTemplateCatalogV32(filters),...searchTemplateCatalogV48(filters),...searchTemplateCatalogV71(filters)],q=String(filters.query||'').trim().toLowerCase(),category=filters.category||'all',standard=filters.standard||'all';
  const namespaces=SCHEMA_NAMESPACES.filter(t=>(category==='all'||t.category===category)&&(standard==='all'||t.standard===standard)&&(!q||[t.id,t.code,t.name,t.nameZh,...t.tags].join(' ').toLowerCase().includes(q)));
  return [...core,...namespaces];
}
