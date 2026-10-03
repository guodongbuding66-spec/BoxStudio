import { approvalGate } from './productionJobs.js';
import { deviceLinkBindingStatus } from './productionPdfV24.js';

export function productionOutputGateV24(state,job){const approved=approvalGate(state,job);if(!approved.ok)return{...approved,stage:'approval'};const color=deviceLinkBindingStatus(state);if(!color.ok)return{ok:false,stage:'color-binding',reason:color.reason,approval:approved,color};return{ok:true,stage:'ready',reason:color.mode==='cmyk'?'Approved revision and declared DeviceLink are both matched.':'Approved revision matches; output uses declared RGB native appearance.',approval:approved,color,fingerprint:approved.fingerprint};}
