import {visibleMarkArtworkV70} from './barcodeGroupV70.js';
import {digitalDecodeFromProductionPdfV31} from './digitalDecodeGateV31.js';

export function checkBarcodePdfV70(state,bytes){
 const elements=visibleMarkArtworkV70(state),groups=elements.filter(e=>e.type==='barcode-qr-group');
 return groups.map(group=>({elementId:group.id,...digitalDecodeFromProductionPdfV31({...state,elements:[group]},bytes)}));
}
export function assertBarcodePdfV70(state,bytes){const reports=checkBarcodePdfV70(state,bytes);if(reports.some(r=>!r.ok))throw Object.assign(new Error('导出稿条码 / QR 解码失败，已阻止下载。请检查内容与布局。'),{code:'BARCODE_PDF_DECODE_FAILED',reports});return bytes;}
