export const TEMPLATE_SCHEMA_VERSION = 1;
export const STANDARD_TEMPLATE_CATALOG = [
  {id:'side-seal-rsc',standard:'FEFCO',code:'0201',name:'Regular slotted / side-seal base',engine:'side-seal-rsc',status:'implemented',parameters:['length','width','height','thickness','glue','flute']},
  {id:'mailer-150010',standard:'CUSTOM',code:'150010',name:'Flip-top mailer reference',engine:'mailer-150010',status:'implemented',parameters:['length','width','height','thickness','wing']},
  {id:'fefco-04xx-schema',standard:'FEFCO',code:'04xx',name:'Folder-type family schema',engine:null,status:'schema-only',parameters:['length','width','height','thickness']},
  {id:'ecma-schema',standard:'ECMA',code:'—',name:'ECMA folding-carton schema namespace',engine:null,status:'schema-only',parameters:['A','B','H','caliper','boardGrade']},
];
export const TEMPLATE_RECORD_EXAMPLE = {
  schemaVersion:TEMPLATE_SCHEMA_VERSION, standard:'FEFCO|ECMA|CUSTOM', code:'string', revision:'string|null', units:'mm', parameters:[], rules:[], geometryGenerator:'module/function|null', validation:[], metadata:{source:'user/admin',approved:false}
};
export function templateCatalogById(id){return STANDARD_TEMPLATE_CATALOG.find(t=>t.id===id)||null}
