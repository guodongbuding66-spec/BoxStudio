import { buildProductionContextV39 } from './productionPdfV39.js';
import { buildProductionPdfV27, productionPdfV27Diagnostics } from './productionPdfV27.js';
import { downloadBytes } from './export.js';

const clone=v=>structuredClone(v);
export const V43_PRODUCTION_SCHEMA='boxstudio-production-v43-native-curves';

export function productionStateV43(state,context){const next=clone(context.productionState);next.exportOptions={...(next.exportOptions||{}),nativeCubicClip:true,nativeStructuralCurves:true};next.productionV43={schema:V43_PRODUCTION_SCHEMA,sourceTemplate:state?.structure?.template||context.topology?.doc?.template||'unknown',nativeStructuralCurves:true,topologyPolicy:'sample-native-curves-for-mesh'};return next}

export function buildProductionContextV43(state,options={}){const base=buildProductionContextV39(state,options);const curveCount=[...(base.importedGeometry?.cutCurves||[]),...(base.importedGeometry?.creaseCurves||[]),...(base.importedGeometry?.perfCurves||[]),...(base.importedGeometry?.glueCurves||[])].length,productionState=productionStateV43(state,base);return{...base,schema:V43_PRODUCTION_SCHEMA,productionState,nativeStructuralCurveObjects:curveCount,nativeStructuralCurves:curveCount>0}}

export function buildProductionPdfV43(state,options={}){const context=buildProductionContextV43(state,options);if(!context.ok){const codes=[...new Set(context.errors.map(x=>x.code))];throw Object.assign(new Error(`V0.43 Production PDF blocked: ${codes.join(', ')||'preflight failed'}`),{code:'V43_PRODUCTION_BLOCKED',context})}return buildProductionPdfV27(context.productionState)}

export function productionPdfV43Diagnostics(state,options={}){const context=buildProductionContextV43(state,options),base=context.ok?productionPdfV27Diagnostics(context.productionState):null;return{schema:V43_PRODUCTION_SCHEMA,ok:context.ok,nativeStructuralCurves:context.nativeStructuralCurves,nativeStructuralCurveObjects:context.nativeStructuralCurveObjects,topology:context.topology?.stats||null,blockingCodes:[...new Set(context.errors.map(x=>x.code))],warningCodes:[...new Set(context.warnings.map(x=>x.code))],serializer:base?.serializer||'v0.27-native-cubic-production',baseDiagnostics:base}}

export function exportProductionPdfV43(state,options={}){const bytes=buildProductionPdfV43(state,options);downloadBytes('boxstudio-v0.43-native-curves-production.pdf',bytes,'application/pdf');return bytes}
