import { buildProductionPdfV24, productionPdfV24Diagnostics, deviceLinkBindingStatus, currentDeviceLinkReference } from './productionPdfV24.js';
import { downloadBytes } from './export.js';

export function buildProductionPdfV25(state){return buildProductionPdfV24(state);}
export function productionPdfV25Diagnostics(state){const diag=productionPdfV24Diagnostics(state);return{...diag,serializer:'v0.25-native-production',deviceLink:currentDeviceLinkReference(),binding:deviceLinkBindingStatus(state)};}
export function exportProductionPdfV25(state){downloadBytes('boxstudio-v0.25-production-native.pdf',buildProductionPdfV25(state),'application/pdf');}
