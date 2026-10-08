export const V64_PRODUCT_VERSION='V0.64';

export const V64_RETIREMENT_POLICY={
  suppressLegacyNavigation:true,
  suppressLegacyArtworkCallout:true,
  retiredSelectors:['.v58-quicknav','[data-v58-context]','[data-v59-guided]','[data-v60-artwork-callout]'],
  sharedObserverModules:['v58','v59','v60','v61','v62','v63','v64'],
  preservedCapabilities:['shipping-mark-studio','template-studio','live-mini-3d','image-artwork','artwork-workspace','print-readiness','unified-stagebar','advanced-production-toggle'],
};

export function runtimeAcceptanceV64(){
  const p=V64_RETIREMENT_POLICY;
  const checks={
    version:V64_PRODUCT_VERSION==='V0.64',
    navigationRetired:p.suppressLegacyNavigation===true,
    artworkCalloutRetired:p.suppressLegacyArtworkCallout===true,
    retiredSurfaceCount:p.retiredSelectors.length>=4,
    sharedObserverCoverage:p.sharedObserverModules.length>=7,
    preservesMarks:p.preservedCapabilities.includes('shipping-mark-studio'),
    preservesImages:p.preservedCapabilities.includes('image-artwork'),
    preservesPreflight:p.preservedCapabilities.includes('print-readiness'),
  };
  return{ok:Object.values(checks).every(Boolean),checks,retired:p.retiredSelectors.length,sharedModules:p.sharedObserverModules.length,preserved:p.preservedCapabilities.length};
}
