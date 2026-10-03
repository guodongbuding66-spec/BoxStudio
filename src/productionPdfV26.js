import { buildProductionPdfV25, productionPdfV25Diagnostics } from './productionPdfV25.js';
import { nativeCubicClipPdfDiagnosticsV26 } from './nativeCubicPdfV26.js';
import { downloadBytes } from './export.js';

export function buildProductionPdfV26(state){return buildProductionPdfV25(state);}
export function productionPdfV26Diagnostics(state){const base=productionPdfV25Diagnostics(state),cubic=nativeCubicClipPdfDiagnosticsV26(state);return{...base,serializer:'v0.26-native-production',nativeCubicClipProof:cubic};}
export function exportProductionPdfV26(state){downloadBytes('boxstudio-v0.26-production-native.pdf',buildProductionPdfV26(state),'application/pdf');}
