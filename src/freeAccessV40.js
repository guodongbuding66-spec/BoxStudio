export const V40_ACCESS_POLICY=Object.freeze({
  schema:'boxstudio-access-v40',
  mode:'free-public',
  price:0,
  currency:'CNY',
  requiresLogin:false,
  requiresApproval:false,
  requiresSubscription:false,
  capabilities:Object.freeze([
    'templates','parametric-structure','2d-editor','dieline-cad','marks','barcode','qr',
    'variables','rules','3d-preview','fold-preview','preflight','svg-export','dxf-export',
    'pdf-export','production-pdf','batch-tools','import-dieline','production-offsets'
  ])
});

export function accessPolicyV40(){return{...V40_ACCESS_POLICY,capabilities:[...V40_ACCESS_POLICY.capabilities]}}
export function canUseFeatureV40(feature){return V40_ACCESS_POLICY.capabilities.includes(String(feature||''))}
export function assertFreeAccessV40(feature){
  if(!canUseFeatureV40(feature))throw Object.assign(new Error(`Unknown BoxStudio V0.40 capability: ${feature}`),{code:'V40_CAPABILITY_UNKNOWN'});
  return true;
}
export function accessBadgeV40(){return 'FREE · No login · No approval'}
