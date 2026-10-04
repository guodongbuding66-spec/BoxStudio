import { V32_TEMPLATE_CATALOG, searchTemplateCatalogV32, templateCatalogByIdV32 } from './parametricTemplatesV32.js';

export const TEMPLATE_SCHEMA_VERSION = 2;

const SCHEMA_NAMESPACES=[
  {id:'fefco-04xx-schema',category:'namespace',standard:'FEFCO',code:'04xx',name:'Folder-type family schema',nameZh:'FEFCO 04xx 结构命名空间',engine:null,status:'schema-only',parameters:['length','width','height','thickness'],tags:['fefco','04xx','namespace']},
  {id:'ecma-schema',category:'namespace',standard:'ECMA',code:'—',name:'ECMA folding-carton schema namespace',nameZh:'ECMA 折叠纸盒命名空间',engine:null,status:'schema-only',parameters:['A','B','H','caliper','boardGrade'],tags:['ecma','folding carton','namespace']},
];

// Core records have a real geometry path. Schema-only namespace records are retained for compatibility/discovery but remain non-actionable.
export const STANDARD_TEMPLATE_CATALOG = [
  ...V32_TEMPLATE_CATALOG.map(t=>({...t,engine:t.id,parameters:[...t.parameters]})),
  ...SCHEMA_NAMESPACES,
];

export const TEMPLATE_RECORD_EXAMPLE = {
  schemaVersion:TEMPLATE_SCHEMA_VERSION,
  standard:'FEFCO|ECMA|CUSTOM',
  code:'string',
  revision:'string|null',
  units:'mm',
  category:'shipping|mailer|folding-carton|tray|rigid|custom|namespace',
  parameters:[],
  rules:[],
  geometryGenerator:'module/function|null',
  validation:[],
  metadata:{source:'user/admin/core',approved:false,realSampleAccepted:false},
};

export function templateCatalogById(id){return templateCatalogByIdV32(id)||SCHEMA_NAMESPACES.find(t=>t.id===id)||null;}
export function searchTemplateCatalog(filters={}){
  const core=searchTemplateCatalogV32(filters),q=String(filters.query||'').trim().toLowerCase(),category=filters.category||'all',standard=filters.standard||'all';
  const namespaces=SCHEMA_NAMESPACES.filter(t=>(category==='all'||t.category===category)&&(standard==='all'||t.standard===standard)&&(!q||[t.id,t.code,t.name,t.nameZh,...t.tags].join(' ').toLowerCase().includes(q)));
  return [...core,...namespaces];
}
