import { buildWorkerPdfTask, buildWorkerPdfTaskV24, buildWorkerPdfTaskV27 } from './batchWorkerCore.js';
import { hydrateWorkerAssetsV24, workerAssetAvailabilityV24 } from './workerAssetsV24.js';

let sessionAvailability={hasTtf:false,hasIcc:false,hasDeviceLink:false,ttfName:'',iccName:'',deviceLinkName:'',deviceLinkFingerprint:''};

self.onmessage = (event) => {
  const data = event.data || {};
  const requestId = data.requestId;
  const index = data.index;
  try {
    if(data.type==='init-assets'){
      if(data.workerAssets)hydrateWorkerAssetsV24(data.workerAssets);
      sessionAvailability=workerAssetAvailabilityV24(data.workerAssets||{});
      self.postMessage({ok:true,type:'assets-ready',requestId,availability:sessionAvailability});
      return;
    }
    if (data.workerAssets) {
      hydrateWorkerAssetsV24(data.workerAssets);
      sessionAvailability=workerAssetAvailabilityV24(data.workerAssets);
    }
    const useV27=data.pipeline==='v27-native-cubic'||data.baseState?.batchPipeline==='v27-native-cubic';
    const useV24=data.pipeline==='v24-native'||data.baseState?.batchPipeline==='v24-native';
    const builder=useV27?buildWorkerPdfTaskV27:useV24?buildWorkerPdfTaskV24:buildWorkerPdfTask;
    const result = builder(data.baseState, data.row, index, {assets: sessionAvailability});
    if (result.ok && result.bytes instanceof Uint8Array) {
      const bytes = result.bytes;
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      self.postMessage({...result, bytes: buffer, requestId}, [buffer]);
    } else {
      self.postMessage({...result, requestId});
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    self.postMessage({ok:false, index, requestId, error:message, errors:[message]});
  }
};