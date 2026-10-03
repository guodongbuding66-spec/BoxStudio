import { buildWorkerPdfTask } from './batchWorkerCore.js';
import { hydrateWorkerAssets, workerAssetAvailability } from './workerAssets.js';

self.onmessage = (event) => {
  const data = event.data || {};
  const requestId = data.requestId;
  const index = data.index;
  try {
    if (data.workerAssets) hydrateWorkerAssets(data.workerAssets);
    const availability = workerAssetAvailability(data.workerAssets || {});
    const result = buildWorkerPdfTask(data.baseState, data.row, index, {assets: availability});
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
