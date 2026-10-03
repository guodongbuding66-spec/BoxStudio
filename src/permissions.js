export const PRODUCTION_ROLES=Object.freeze({
  viewer:Object.freeze({id:'viewer',label:'Viewer',actions:['view']}),
  operator:Object.freeze({id:'operator',label:'Operator',actions:['view','create','submit','revise','export-approved']}),
  approver:Object.freeze({id:'approver',label:'Approver',actions:['view','approve','reject','export-approved']}),
  admin:Object.freeze({id:'admin',label:'Admin',actions:['view','create','submit','revise','approve','reject','export-approved','delete']}),
});

export const PRODUCTION_ACTIONS=Object.freeze(['view','create','submit','revise','approve','reject','export-approved','delete']);

export function normalizeProductionRole(role='operator'){
  const id=String(role||'operator').trim().toLowerCase();
  return PRODUCTION_ROLES[id]?id:'viewer';
}

export function canProductionAction(role,action){
  const normalized=normalizeProductionRole(role);
  return PRODUCTION_ROLES[normalized].actions.includes(String(action||''));
}

export function assertProductionPermission(role,action){
  const normalized=normalizeProductionRole(role);
  if(!canProductionAction(normalized,action)){
    throw new Error(`${PRODUCTION_ROLES[normalized].label} role cannot perform production action: ${action}.`);
  }
  return normalized;
}

export function productionRoleOptions(){
  return Object.values(PRODUCTION_ROLES).map(role=>({id:role.id,label:role.label,actions:[...role.actions]}));
}
