export const V65_PRODUCT_VERSION='V0.65';
export const V65_SHARED_OBSERVER_MODULES=['v55','v56','v57','v58','v59','v60','v61','v62','v63','v64','v65'];
export const V65_MANUFACTURING_CHAIN=['v55','v56','v57'];
export const V65_VISUAL_SURFACES=['templates','structure','artwork','marks','3d','preflight','export','manufacturing','factory','routing','mobile'];
export const V65_PRESERVED_CAPABILITIES=['manufacturing-intelligence','factory-capability','factory-routing','shipping-marks','image-artwork','artwork-workspace','print-readiness','linked-3d','production-preflight','production-export'];

export function runtimeAcceptanceV65(stats=null){
  const registered=Array.isArray(stats?.registered)?stats.registered:V65_SHARED_OBSERVER_MODULES;
  const checks={
    version:V65_PRODUCT_VERSION==='V0.65',
    oneObserver:stats?stats.observerCount===1:true,
    manufacturingChain:V65_MANUFACTURING_CHAIN.every(x=>registered.includes(x)),
    sharedCoverage:V65_SHARED_OBSERVER_MODULES.every(x=>registered.includes(x)),
    noRuntimeErrors:stats?Array.isArray(stats.errors)&&stats.errors.length===0:true,
    visualCoverage:V65_VISUAL_SURFACES.length>=11,
    preservedCapabilities:V65_PRESERVED_CAPABILITIES.length>=10,
  };
  return{ok:Object.values(checks).every(Boolean),checks,sharedModules:V65_SHARED_OBSERVER_MODULES.length,manufacturingModules:V65_MANUFACTURING_CHAIN.length,visualSurfaces:V65_VISUAL_SURFACES.length,preserved:V65_PRESERVED_CAPABILITIES.length};
}
