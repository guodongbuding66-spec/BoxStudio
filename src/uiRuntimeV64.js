import { V64_PRODUCT_VERSION,V64_RETIREMENT_POLICY,runtimeAcceptanceV64 } from './runtimeV64.js';

const callbacks=new Map();
const moduleRuns=new Map();
const errors=[];
let observer=null,queued=false,flushes=0,mutationBatches=0;

function run(name,fn){
  try{fn();moduleRuns.set(name,(moduleRuns.get(name)||0)+1)}
  catch(error){errors.push({name,message:error?.message||String(error),at:Date.now()});if(errors.length>20)errors.shift();console.error(`[BoxStudio V0.64 UI Runtime] ${name}`,error)}
}
function flush(){queued=false;flushes++;for(const [name,fn] of callbacks)run(name,fn)}
function schedule(){if(queued)return;queued=true;queueMicrotask(flush)}
function start(){
  if(observer||!document.body)return;
  observer=new MutationObserver(()=>{mutationBatches++;schedule()});
  observer.observe(document.body,{childList:true,subtree:true});
  document.body.dataset.v64Runtime='shared-observer';
}
function register(name,fn){
  if(!name||typeof fn!=='function')throw new Error('V64_RUNTIME_REGISTER_INVALID');
  callbacks.set(String(name),fn);start();schedule();
  return()=>callbacks.delete(String(name));
}
function stats(){return{version:V64_PRODUCT_VERSION,observerCount:observer?1:0,registered:[...callbacks.keys()],registeredCount:callbacks.size,flushes,mutationBatches,moduleRuns:Object.fromEntries(moduleRuns),errors:[...errors],policy:V64_RETIREMENT_POLICY,acceptance:runtimeAcceptanceV64()}}
function disconnect(){observer?.disconnect();observer=null;document.body?.removeAttribute('data-v64-runtime')}

window.BoxStudioUiRuntimeV64={version:V64_PRODUCT_VERSION,policy:V64_RETIREMENT_POLICY,register,schedule,flush:()=>{queued=false;flush()},stats,disconnect,getAcceptance:runtimeAcceptanceV64};
start();schedule();
