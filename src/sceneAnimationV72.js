import {foldedMeshesV71} from './threeExportV71.js';
import {renderSceneV71,sceneSettingsV71} from './scene3dV71.js';

export function sceneAnimationFrameV72(t,{mode='assembly',settings={},progress=100}={}){t=Math.max(0,Math.min(1,Number(t)||0));const s=sceneSettingsV71(settings);return{progress:mode==='assembly'?100*(.5-Math.cos(Math.PI*t)/2):progress,settings:{...s,yaw:mode==='turntable'?s.yaw+Math.PI*2*t:s.yaw}};}
export function animationMimeV72(){if(typeof MediaRecorder==='undefined')return null;return['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||null;}
export async function recordSceneAnimationV72({state,geo,graph,textures,settings,progress=100,authoring={},mode='assembly',seconds=6,width=1280,height=960,signal,onProgress=()=>{}}){
 const mimeType=animationMimeV72();if(!mimeType)throw new Error('当前浏览器不支持 WebM 录制，请使用 Chrome、Edge 或 Firefox。');
 if(!['assembly','turntable'].includes(mode)||![6,10].includes(seconds))throw new Error('动画参数无效。');
 const canvas=document.createElement('canvas');if(typeof canvas.captureStream!=='function')throw new Error('当前浏览器不能录制画布。');canvas.width=width;canvas.height=height;
 const snapshot=structuredClone(state),base=sceneSettingsV71(settings);if(!base.background){base.preset='paper';base.background='#ffffff';}
 const frame=(t)=>{const f=sceneAnimationFrameV72(t,{mode,settings:base,progress}),meshes=foldedMeshesV71(snapshot,geo,graph,{progress:f.progress,authoring});renderSceneV71(meshes,textures,f.settings,width,height,canvas);};
 frame(0);const stream=canvas.captureStream(12),chunks=[],recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:5_000_000});let timer=null,done=false;
 try{return await new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  const fail=e=>{if(done)return;done=true;cleanup();if(recorder.state!=='inactive')recorder.stop();reject(e);};
  const abort=()=>fail(new DOMException('已取消动画导出。','AbortError'));if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=e=>fail(e.error||new Error('动画编码失败。'));
  recorder.onstop=()=>{if(done)return;done=true;cleanup();const blob=new Blob(chunks,{type:'video/webm'});if(blob.size<1024)reject(new Error('动画文件没有有效视频内容。'));else resolve(blob);};
  recorder.start(250);const start=performance.now();
  const tick=()=>{if(done)return;try{const t=Math.min(1,(performance.now()-start)/(seconds*1000));frame(t);onProgress(Math.round(t*100));if(t>=1){timer=setTimeout(()=>recorder.stop(),150);}else timer=setTimeout(tick,1000/12);}catch(e){fail(e);}};tick();
 });}finally{clearTimeout(timer);stream.getTracks().forEach(track=>track.stop());}
}
