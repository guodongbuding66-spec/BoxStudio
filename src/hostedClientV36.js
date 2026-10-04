export const V36_SESSION_STORAGE_KEY='boxstudio-v36-hosted-session';
export const V36_ENDPOINT_STORAGE_KEY='boxstudio-v36-hosted-endpoint';

function join(base,path=''){
  const root=String(base||'/api/v1').trim().replace(/\/+$/,'');
  return `${root}/${String(path||'').replace(/^\/+/, '')}`;
}
async function decode(response){const type=response.headers?.get?.('content-type')||'';if(response.status===204)return null;if(type.includes('application/json'))return response.json();const text=await response.text();try{return JSON.parse(text)}catch{return text}}

export function createHostedApiV36({baseUrl='/api/v1',fetchImpl=globalThis.fetch,storage=globalThis.localStorage}={}){
  if(typeof fetchImpl!=='function')throw new Error('Hosted API requires fetch.');
  let token='';try{token=String(storage?.getItem?.(V36_SESSION_STORAGE_KEY)||'')}catch{}
  const setToken=value=>{token=String(value||'');try{if(token)storage?.setItem?.(V36_SESSION_STORAGE_KEY,token);else storage?.removeItem?.(V36_SESSION_STORAGE_KEY)}catch{}};
  const request=async(path,{method='GET',body=null,headers={}}={})=>{
    const response=await fetchImpl(join(baseUrl,path),{method,headers:{accept:'application/json',...(token?{authorization:`Bearer ${token}`}:{})...(body!=null?{'content-type':'application/json'}:{}),...headers},...(body!=null?{body:JSON.stringify(body)}:{})});
    const payload=await decode(response);if(!response.ok){const error=new Error(payload?.message||`Hosted API ${response.status}`);error.status=response.status;error.code=payload?.error;error.detail=payload?.detail;throw error;}return payload;
  };
  return{
    get token(){return token;},
    setToken,
    async login(email,password){const result=await request('auth/login',{method:'POST',body:{email,password}});setToken(result.token);return result;},
    async logout(){try{return await request('auth/logout',{method:'POST'})}finally{setToken('')}},
    session(){return request('session')},
    listProjects(){return request('projects')},
    createProject(payload){return request('projects',{method:'POST',body:payload})},
    getProject(id){return request(`projects/${encodeURIComponent(id)}`)},
    listRevisions(id){return request(`projects/${encodeURIComponent(id)}/revisions`)},
    getRevision(id,revision){return request(`projects/${encodeURIComponent(id)}/revisions/${Number(revision)}`)},
    createRevision(id,{state,expectedRevision,reason=''}){return request(`projects/${encodeURIComponent(id)}/revisions`,{method:'POST',headers:{'if-match':String(expectedRevision)},body:{state,reason}})},
    submitRevision(id,revision,reason=''){return request(`projects/${encodeURIComponent(id)}/revisions/${Number(revision)}/submit`,{method:'POST',body:{reason}})},
    approveRevision(id,revision,reason=''){return request(`projects/${encodeURIComponent(id)}/revisions/${Number(revision)}/approve`,{method:'POST',body:{reason}})},
    rejectRevision(id,revision,reason=''){return request(`projects/${encodeURIComponent(id)}/revisions/${Number(revision)}/reject`,{method:'POST',body:{reason}})},
    productionGate(id,revision){return request(`projects/${encodeURIComponent(id)}/revisions/${Number(revision)}/production-gate`,{method:'POST',body:{}})},
    audit({projectId=null,afterSeq=0}={}){const params=new URLSearchParams();if(projectId)params.set('projectId',projectId);if(afterSeq)params.set('afterSeq',String(afterSeq));return request(`audit${params.size?`?${params}`:''}`)},
    verifyAudit(){return request('audit/verify')},
  };
}
