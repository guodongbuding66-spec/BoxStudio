import { buildProductionPdfV24, productionPdfV24Diagnostics, currentDeviceLinkReference, deviceLinkBindingStatus } from './productionPdfV24.js';
import { crossClipNodes } from './clipPathV25.js';
import { downloadBytes } from './export.js';

function withNativeCubic(state){const next=structuredClone(state||{});next.exportOptions={...(next.exportOptions||{}),nativeCubicClip:true};return next;}
export function buildProductionPdfV27(state){return buildProductionPdfV24(withNativeCubic(state));}
export function productionPdfV27Diagnostics(state){const next=withNativeCubic(state),base=productionPdfV24Diagnostics(next),nativeCubicClipObjects=(next.elements||[]).filter(e=>e?.type==='cross-panel-artwork'&&crossClipNodes(e).length>=3).length;return{...base,serializer:'v0.27-native-cubic-production',nativeCubicProduction:true,nativeCubicClipObjects,deviceLink:currentDeviceLinkReference(),binding:deviceLinkBindingStatus(next)};}
export function exportProductionPdfV27(state){downloadBytes('boxstudio-v0.27-production-native-cubic.pdf',buildProductionPdfV27(state),'application/pdf');}
