import { getUserTtfSource, loadUserTtf } from './fontRegistry.js';
import { getOutputIccSource, loadOutputIcc } from './iccRegistry.js';

function toBytes(value){
  if(value instanceof Uint8Array)return new Uint8Array(value);
  if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));
  if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength));
  if(Array.isArray(value))return Uint8Array.from(value);
  return null;
}
function copyAsset(asset){if(!asset)return null;const bytes=toBytes(asset.bytes);return bytes?{name:String(asset.name||'asset.bin'),bytes}:null;}

export function collectWorkerAssets(){
  const ttf=copyAsset(getUserTtfSource?.()),icc=copyAsset(getOutputIccSource?.());
  return {ttf,icc};
}

export function workerAssetAvailability(assets=collectWorkerAssets()){
  return {hasTtf:Boolean(assets?.ttf?.bytes?.byteLength),hasIcc:Boolean(assets?.icc?.bytes?.byteLength),ttfName:assets?.ttf?.name||'',iccName:assets?.icc?.name||''};
}

export function transferableWorkerAssets(assets=collectWorkerAssets()){
  const payload={ttf:null,icc:null},transfer=[];
  for(const key of ['ttf','icc']){
    const asset=copyAsset(assets?.[key]);if(!asset)continue;
    const buffer=asset.bytes.buffer.slice(asset.bytes.byteOffset,asset.bytes.byteOffset+asset.bytes.byteLength);
    payload[key]={name:asset.name,bytes:buffer};transfer.push(buffer);
  }
  return {payload,transfer};
}

export function hydrateWorkerAssets(assets={}){
  const result={ttf:null,icc:null};
  if(assets?.ttf?.bytes){const bytes=toBytes(assets.ttf.bytes);result.ttf=loadUserTtf(bytes,assets.ttf.name||'Worker TTF');}
  if(assets?.icc?.bytes){const bytes=toBytes(assets.icc.bytes);result.icc=loadOutputIcc(bytes,assets.icc.name||'Worker ICC');}
  return result;
}

export function describeWorkerAssets(assets=collectWorkerAssets()){
  const a=workerAssetAvailability(assets);return {ttf:a.hasTtf?`${a.ttfName} (${Math.round(assets.ttf.bytes.byteLength/1024)} KB)`:'not loaded',icc:a.hasIcc?`${a.iccName} (${Math.round(assets.icc.bytes.byteLength/1024)} KB)`:'not loaded'};
}
