import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const V36_API_VERSION='v1';
export const V36_BACKEND_SCHEMA='boxstudio-hosted-backend-v36';

export class BackendError extends Error{
  constructor(message,{status=400,code='BAD_REQUEST',detail=null}={}){super(message);this.name='BackendError';this.status=status;this.code=code;this.detail=detail;}
}

const clone=value=>structuredClone(value);
const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const slug=value=>String(value||'project').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'project';
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
export function canonicalJsonV36(value){return JSON.stringify(stable(value));}
export function sha256TextV36(text=''){return createHash('sha256').update(String(text)).digest('hex');}
export function sha256JsonV36(value){return sha256TextV36(canonicalJsonV36(value));}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);return value;}
function immutableClone(value){return deepFreeze(clone(value));}

export const V36_ROLE_POLICIES=Object.freeze({
  viewer:Object.freeze(['project:read','revision:read','audit:read']),
  operator:Object.freeze(['project:read','project:create','revision:read','revision:create','revision:submit','revision:export','audit:read']),
  approver:Object.freeze(['project:read','revision:read','revision:approve','revision:reject','revision:export','audit:read']),
  admin:Object.freeze(['project:read','project:create','revision:read','revision:create','revision:submit','revision:approve','revision:reject','revision:export','audit:read','audit:verify']),
});
export function canHostedActionV36(role,action){return Boolean(V36_ROLE_POLICIES[String(role||'viewer').toLowerCase()]?.includes(String(action||'')));}

export function createPasswordCredentialV36(password,{salt=null,cost=16384}={}){
  const text=String(password||'');if(text.length<8)throw new BackendError('Password must be at least 8 characters.',{code:'PASSWORD_POLICY'});
  const actualSalt=salt||randomBytes(16).toString('hex'),hash=scryptSync(text,actualSalt,32,{N:cost}).toString('hex');
  return{algorithm:'scrypt',salt:actualSalt,hash,cost};
}
export function verifyPasswordCredentialV36(password,credential){
  if(!credential||credential.algorithm!=='scrypt'||!credential.salt||!credential.hash)return false;
  const derived=scryptSync(String(password||''),credential.salt,32,{N:Number(credential.cost)||16384}),expected=Buffer.from(credential.hash,'hex');
  return derived.length===expected.length&&timingSafeEqual(derived,expected);
}

function sanitizeUser(user){return{id:user.id,email:user.email,name:user.name,role:user.role,active:user.active!==false};}
function normalizeUsers(users=[]){
  const map=new Map();for(const raw of users){const email=normalizeEmail(raw.email);if(!email)throw new BackendError('Hosted user requires email.',{code:'USER_EMAIL_REQUIRED'});const role=String(raw.role||'viewer').toLowerCase();if(!V36_ROLE_POLICIES[role])throw new BackendError(`Unsupported hosted role: ${role}.`,{code:'ROLE_INVALID'});const credential=raw.credential||createPasswordCredentialV36(raw.password||'');const user=deepFreeze({id:String(raw.id||email),email,name:String(raw.name||email),role,active:raw.active!==false,credential:immutableClone(credential)});map.set(email,user);}return map;
}
function authError(message='Authentication required.'){return new BackendError(message,{status:401,code:'UNAUTHENTICATED'});}
function forbidden(action){return new BackendError(`Authenticated user cannot perform ${action}.`,{status:403,code:'FORBIDDEN'});}
function missing(kind,id){return new BackendError(`${kind} not found: ${id}.`,{status:404,code:'NOT_FOUND'});}
function conflict(message,detail=null){return new BackendError(message,{status:409,code:'CONFLICT',detail});}
function assertWorkflow(workflow,allowed,action){if(!allowed.includes(workflow?.status))throw conflict(`${action} is not allowed while revision status is ${workflow?.status||'unknown'}.`);}

export function verifyAuditChainV36(events=[]){
  let prev='GENESIS';for(let index=0;index<events.length;index++){const event=events[index];if(event.seq!==index+1||event.prevHash!==prev)return{ok:false,index,reason:'sequence-or-prev-hash'};const payload={...event};delete payload.hash;const expected=sha256JsonV36(payload);if(expected!==event.hash)return{ok:false,index,reason:'hash-mismatch',expected,actual:event.hash};prev=event.hash;}return{ok:true,count:events.length,head:prev};
}

export function createHostedBackendV36({users=[],sessionTtlMs=8*60*60*1000,now=()=>new Date(),tokenFactory=()=>randomBytes(24).toString('hex')}={}){
  const userMap=normalizeUsers(users),sessions=new Map(),projects=new Map(),audit=[];
  const nowIso=()=>now().toISOString();
  function appendAudit({actorId,action,resource='system',resourceId='',projectId='',revision=null,reason='',metadata={}}){
    const prevHash=audit.at(-1)?.hash||'GENESIS',payload={schema:'boxstudio-audit-event-v36',seq:audit.length+1,id:`audit-${audit.length+1}`,at:nowIso(),actorId:String(actorId||'system'),action:String(action),resource:String(resource),resourceId:String(resourceId||''),projectId:String(projectId||''),revision:revision==null?null:Number(revision),reason:String(reason||''),metadata:clone(metadata||{}),prevHash};payload.hash=sha256JsonV36(payload);const event=deepFreeze(payload);audit.push(event);return clone(event);
  }
  function requireSession(token){const session=sessions.get(String(token||''));if(!session)throw authError();if(session.expiresAt<=now().getTime()){sessions.delete(String(token));throw authError('Session expired.');}const user=[...userMap.values()].find(item=>item.id===session.userId);if(!user||user.active===false)throw authError('User is inactive.');return{session,user};}
  function authorize(token,action){const {session,user}=requireSession(token);if(!canHostedActionV36(user.role,action))throw forbidden(action);return{session,user};}
  function revisionMap(projectId){const project=projects.get(projectId);if(!project)throw missing('Project',projectId);return project;}
  function revisionKey(projectId,revision){return`${projectId}@${revision}`;}
  function createRevisionRecord(project,state,{revision,parentRevision,actorId,reason=''}){
    const snapshot=immutableClone(state||{}),snapshotHash=sha256JsonV36(snapshot),createdAt=nowIso();
    const record=deepFreeze({schema:'boxstudio-artwork-revision-v36',projectId:project.id,revision,parentRevision:parentRevision==null?null:Number(parentRevision),createdAt,createdBy:actorId,reason:String(reason||''),snapshotHash,snapshot});
    project.revisions.set(revision,record);project.workflows.set(revision,{status:'draft',submittedAt:null,submittedBy:null,approvedAt:null,approvedBy:null,rejectedAt:null,rejectedBy:null,reason:''});project.currentRevision=revision;project.updatedAt=createdAt;project.updatedBy=actorId;return record;
  }
  function publicWorkflow(project,revision){const workflow=project.workflows.get(revision);return workflow?clone(workflow):null;}
  function publicRevision(project,revision,{includeSnapshot=true}={}){const record=project.revisions.get(Number(revision));if(!record)throw missing('Revision',revision);const out=clone(record);if(!includeSnapshot)delete out.snapshot;out.workflow=publicWorkflow(project,Number(revision));return out;}
  function projectSummary(project){const workflow=publicWorkflow(project,project.currentRevision);return{id:project.id,name:project.name,createdAt:project.createdAt,createdBy:project.createdBy,updatedAt:project.updatedAt,updatedBy:project.updatedBy,currentRevision:project.currentRevision,currentStatus:workflow?.status||'draft',revisionCount:project.revisions.size};}

  return{
    schema:V36_BACKEND_SCHEMA,
    login({email,password}){const user=userMap.get(normalizeEmail(email));if(!user||user.active===false||!verifyPasswordCredentialV36(password,user.credential))throw authError('Invalid email or password.');const token=tokenFactory(),issuedAt=now().getTime(),session={token,userId:user.id,issuedAt,expiresAt:issuedAt+sessionTtlMs};sessions.set(token,session);appendAudit({actorId:user.id,action:'auth.login',resource:'session',resourceId:sha256TextV36(token).slice(0,16)});return{token,expiresAt:new Date(session.expiresAt).toISOString(),user:sanitizeUser(user)};},
    logout(token){const existing=sessions.get(String(token||''));if(existing){sessions.delete(String(token));appendAudit({actorId:existing.userId,action:'auth.logout',resource:'session'});}return{ok:true};},
    getSession(token){const {session,user}=requireSession(token);return{expiresAt:new Date(session.expiresAt).toISOString(),user:sanitizeUser(user)};},
    listProjects(token){authorize(token,'project:read');return[...projects.values()].map(projectSummary).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));},
    createProject(token,{id,name,state,reason=''}={}){const {user}=authorize(token,'project:create'),projectId=slug(id||name||state?.projectName||'boxstudio-project');if(projects.has(projectId))throw conflict(`Project already exists: ${projectId}.`);const createdAt=nowIso(),project={id:projectId,name:String(name||state?.projectName||projectId),createdAt,createdBy:user.id,updatedAt:createdAt,updatedBy:user.id,currentRevision:0,revisions:new Map(),workflows:new Map()};projects.set(projectId,project);const revision=createRevisionRecord(project,state,{revision:1,parentRevision:null,actorId:user.id,reason});appendAudit({actorId:user.id,action:'project.created',resource:'project',resourceId:projectId,projectId,revision:1,reason,metadata:{snapshotHash:revision.snapshotHash}});appendAudit({actorId:user.id,action:'revision.created',resource:'revision',resourceId:revisionKey(projectId,1),projectId,revision:1,reason,metadata:{snapshotHash:revision.snapshotHash}});return{...projectSummary(project),revision:publicRevision(project,1)};},
    getProject(token,projectId){authorize(token,'project:read');const project=revisionMap(projectId);return{...projectSummary(project),revision:publicRevision(project,project.currentRevision)};},
    listRevisions(token,projectId){authorize(token,'revision:read');const project=revisionMap(projectId);return[...project.revisions.keys()].sort((a,b)=>b-a).map(revision=>publicRevision(project,revision,{includeSnapshot:false}));},
    getRevision(token,projectId,revision){authorize(token,'revision:read');return publicRevision(revisionMap(projectId),Number(revision));},
    createRevision(token,projectId,{state,expectedRevision,reason=''}={}){const {user}=authorize(token,'revision:create'),project=revisionMap(projectId),expected=Number(expectedRevision);if(!Number.isInteger(expected)||expected!==project.currentRevision)throw conflict('Project revision conflict.',{expected:project.currentRevision,actual:Number.isFinite(expected)?expected:null});const revision=project.currentRevision+1,record=createRevisionRecord(project,state,{revision,parentRevision:expected,actorId:user.id,reason});appendAudit({actorId:user.id,action:'revision.created',resource:'revision',resourceId:revisionKey(projectId,revision),projectId,revision,reason,metadata:{parentRevision:expected,snapshotHash:record.snapshotHash}});return publicRevision(project,revision);},
    submitRevision(token,projectId,revision,{reason=''}={}){const {user}=authorize(token,'revision:submit'),project=revisionMap(projectId),rev=Number(revision),record=project.revisions.get(rev);if(!record)throw missing('Revision',revision);const workflow=project.workflows.get(rev);assertWorkflow(workflow,['draft'],'Submit');workflow.status='submitted';workflow.submittedAt=nowIso();workflow.submittedBy=user.id;workflow.reason=String(reason||'');project.updatedAt=workflow.submittedAt;project.updatedBy=user.id;appendAudit({actorId:user.id,action:'revision.submitted',resource:'revision',resourceId:revisionKey(projectId,rev),projectId,revision:rev,reason,metadata:{snapshotHash:record.snapshotHash}});return publicRevision(project,rev,{includeSnapshot:false});},
    approveRevision(token,projectId,revision,{reason=''}={}){const {user}=authorize(token,'revision:approve'),project=revisionMap(projectId),rev=Number(revision),record=project.revisions.get(rev);if(!record)throw missing('Revision',revision);const workflow=project.workflows.get(rev);assertWorkflow(workflow,['submitted'],'Approve');if(workflow.submittedBy===user.id||record.createdBy===user.id)throw new BackendError('Separation of duties: the revision author/submitter cannot approve the same revision.',{status:403,code:'SEPARATION_OF_DUTIES'});workflow.status='approved';workflow.approvedAt=nowIso();workflow.approvedBy=user.id;workflow.reason=String(reason||'');project.updatedAt=workflow.approvedAt;project.updatedBy=user.id;appendAudit({actorId:user.id,action:'revision.approved',resource:'revision',resourceId:revisionKey(projectId,rev),projectId,revision:rev,reason,metadata:{snapshotHash:record.snapshotHash}});return publicRevision(project,rev,{includeSnapshot:false});},
    rejectRevision(token,projectId,revision,{reason=''}={}){const {user}=authorize(token,'revision:reject'),project=revisionMap(projectId),rev=Number(revision),record=project.revisions.get(rev);if(!record)throw missing('Revision',revision);const workflow=project.workflows.get(rev);assertWorkflow(workflow,['submitted'],'Reject');if(workflow.submittedBy===user.id)throw new BackendError('Separation of duties: the submitter cannot reject the same revision.',{status:403,code:'SEPARATION_OF_DUTIES'});if(!String(reason||'').trim())throw new BackendError('Rejection reason is required.',{code:'REJECTION_REASON_REQUIRED'});workflow.status='rejected';workflow.rejectedAt=nowIso();workflow.rejectedBy=user.id;workflow.reason=String(reason);project.updatedAt=workflow.rejectedAt;project.updatedBy=user.id;appendAudit({actorId:user.id,action:'revision.rejected',resource:'revision',resourceId:revisionKey(projectId,rev),projectId,revision:rev,reason,metadata:{snapshotHash:record.snapshotHash}});return publicRevision(project,rev,{includeSnapshot:false});},
    productionGate(token,projectId,revision){authorize(token,'revision:export');const project=revisionMap(projectId),rev=Number(revision),record=project.revisions.get(rev);if(!record)throw missing('Revision',revision);const workflow=project.workflows.get(rev);if(workflow.status!=='approved')throw conflict(`Revision ${rev} is ${workflow.status}, not approved.`);return{ok:true,projectId,revision:rev,snapshotHash:record.snapshotHash,approvedAt:workflow.approvedAt,approvedBy:workflow.approvedBy};},
    getAudit(token,{projectId=null,afterSeq=0}={}){authorize(token,'audit:read');return audit.filter(event=>event.seq>Number(afterSeq||0)&&(!projectId||event.projectId===projectId)).map(clone);},
    verifyAudit(token){authorize(token,'audit:verify');return verifyAuditChainV36(audit);},
    _debugAudit(){return audit.map(clone);},
  };
}
