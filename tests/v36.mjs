import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState } from '../src/model.js';
import { createHostedApiV36 } from '../src/hostedClientV36.js';
import { createHostedBackendV36, verifyAuditChainV36, sha256JsonV36 } from '../server/domainV36.mjs';
import { createV36HttpServer } from '../server/httpV36.mjs';

const users=[
  {id:'alice',email:'alice@example.test',name:'Alice Operator',role:'operator',password:'operator-1234'},
  {id:'bob',email:'bob@example.test',name:'Bob Approver',role:'approver',password:'approver-1234'},
  {id:'eve',email:'eve@example.test',name:'Eve Viewer',role:'viewer',password:'viewer-123456'},
  {id:'root',email:'root@example.test',name:'Root Admin',role:'admin',password:'admin-1234567'},
];
let tokenIndex=0;
const service=createHostedBackendV36({users,tokenFactory:()=>`token-${++tokenIndex}`});
assert.throws(()=>service.login({email:'alice@example.test',password:'wrong-pass'}),error=>error?.status===401&&error?.code==='UNAUTHENTICATED');
const alice=service.login({email:'alice@example.test',password:'operator-1234'}),bob=service.login({email:'bob@example.test',password:'approver-1234'}),eve=service.login({email:'eve@example.test',password:'viewer-123456'}),root=service.login({email:'root@example.test',password:'admin-1234567'});
assert.equal(service.getSession(alice.token).user.role,'operator');

const source=structuredClone(defaultState);source.projectName='Hosted V36';source.variables.sku='HOSTED-001';
const created=service.createProject(alice.token,{id:'hosted-demo',name:'Hosted Demo',state:source,reason:'initial server revision'});
assert.equal(created.currentRevision,1);assert.equal(created.currentStatus,'draft');assert.equal(created.revision.snapshot.variables.sku,'HOSTED-001');assert.match(created.revision.snapshotHash,/^[a-f0-9]{64}$/);
assert.equal(created.revision.snapshotHash,sha256JsonV36(created.revision.snapshot));

// Returned snapshots are copies; mutating a response must never mutate the server authority.
created.revision.snapshot.variables.sku='MUTATED-CLIENT';
assert.equal(service.getRevision(alice.token,'hosted-demo',1).snapshot.variables.sku,'HOSTED-001');

// Role is server-authoritative: operator can submit but cannot approve, viewer cannot export.
const submitted=service.submitRevision(alice.token,'hosted-demo',1,{reason:'ready for approval'});assert.equal(submitted.workflow.status,'submitted');
assert.throws(()=>service.approveRevision(alice.token,'hosted-demo',1,{reason:'spoof self approval'}),error=>error?.status===403&&error?.code==='FORBIDDEN');
assert.throws(()=>service.productionGate(eve.token,'hosted-demo',1),error=>error?.status===403&&error?.code==='FORBIDDEN');
const approved=service.approveRevision(bob.token,'hosted-demo',1,{reason:'approved by separate approver'});assert.equal(approved.workflow.status,'approved');
const gate=service.productionGate(alice.token,'hosted-demo',1);assert.equal(gate.ok,true);assert.equal(gate.snapshotHash,created.revision.snapshotHash);

// Optimistic concurrency blocks stale browser tabs.
const nextState=structuredClone(source);nextState.variables.sku='HOSTED-002';
assert.throws(()=>service.createRevision(alice.token,'hosted-demo',{state:nextState,expectedRevision:0}),error=>error?.status===409&&error?.code==='CONFLICT');
const rev2=service.createRevision(alice.token,'hosted-demo',{state:nextState,expectedRevision:1,reason:'sku update'});assert.equal(rev2.revision,2);assert.equal(rev2.parentRevision,1);assert.notEqual(rev2.snapshotHash,created.revision.snapshotHash);
assert.equal(service.getRevision(alice.token,'hosted-demo',1).workflow.status,'approved');assert.equal(service.getRevision(alice.token,'hosted-demo',1).snapshot.variables.sku,'HOSTED-001');

// Even an admin cannot author/submit and then approve the same immutable revision.
const adminState=structuredClone(nextState);adminState.variables.sku='HOSTED-003';
const rev3=service.createRevision(root.token,'hosted-demo',{state:adminState,expectedRevision:2,reason:'admin authored'});service.submitRevision(root.token,'hosted-demo',3,{reason:'admin submit'});
assert.throws(()=>service.approveRevision(root.token,'hosted-demo',3,{reason:'self approve'}),error=>error?.status===403&&error?.code==='SEPARATION_OF_DUTIES');
const rejected=service.rejectRevision(bob.token,'hosted-demo',3,{reason:'independent rejection'});assert.equal(rejected.workflow.status,'rejected');
assert.throws(()=>service.submitRevision(alice.token,'hosted-demo',3,{reason:'resubmit rejected immutable snapshot'}),error=>error?.status===409);

const audit=service.getAudit(alice.token,{projectId:'hosted-demo'});assert.ok(audit.length>=7);assert.equal(verifyAuditChainV36(service._debugAudit()).ok,true);const tampered=service._debugAudit();tampered[0].action='tampered';assert.equal(verifyAuditChainV36(tampered).ok,false);assert.equal(service.verifyAudit(root.token).ok,true);assert.throws(()=>service.verifyAudit(alice.token),error=>error?.status===403);

// Real HTTP + browser client contract.
const runtime=createV36HttpServer({users});const info=await runtime.listen({port:0,host:'127.0.0.1'});
try{
  const storageMap=new Map(),storage={getItem:key=>storageMap.get(key)||null,setItem:(key,value)=>storageMap.set(key,String(value)),removeItem:key=>storageMap.delete(key)};
  const operator=createHostedApiV36({baseUrl:`${info.url}/api/v1`,storage});
  const login=await operator.login('alice@example.test','operator-1234');assert.equal(login.user.role,'operator');assert.ok(operator.token);
  const httpSource=structuredClone(defaultState);httpSource.projectName='HTTP Project';httpSource.variables.sku='HTTP-001';
  const httpProject=await operator.createProject({id:'http-demo',name:'HTTP Demo',state:httpSource});assert.equal(httpProject.currentRevision,1);
  const httpSubmitted=await operator.submitRevision('http-demo',1,'ready');assert.equal(httpSubmitted.workflow.status,'submitted');
  await assert.rejects(()=>operator.approveRevision('http-demo',1,'client role spoof impossible'),error=>error?.status===403&&error?.code==='FORBIDDEN');

  const approverStorage={getItem:()=>null,setItem(){},removeItem(){}};const approver=createHostedApiV36({baseUrl:`${info.url}/api/v1`,storage:approverStorage});await approver.login('bob@example.test','approver-1234');const httpApproved=await approver.approveRevision('http-demo',1,'approved');assert.equal(httpApproved.workflow.status,'approved');
  const httpGate=await operator.productionGate('http-demo',1);assert.equal(httpGate.ok,true);
  const conflictState=structuredClone(httpSource);conflictState.variables.sku='HTTP-002';await assert.rejects(()=>operator.createRevision('http-demo',{state:conflictState,expectedRevision:0,reason:'stale tab'}),error=>error?.status===409&&error?.code==='CONFLICT');
  const httpRev2=await operator.createRevision('http-demo',{state:conflictState,expectedRevision:1,reason:'new version'});assert.equal(httpRev2.revision,2);
  const events=await operator.audit({projectId:'http-demo'});assert.ok(events.events.some(event=>event.action==='revision.approved'));
  await operator.logout();await assert.rejects(()=>operator.session(),error=>error?.status===401);
}finally{await runtime.close();}

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.36.0');
const httpSourceText=await readFile(new URL('../server/httpV36.mjs',import.meta.url),'utf8');assert.ok(httpSourceText.includes('BOXSTUDIO_USERS_JSON'));assert.ok(httpSourceText.includes("'if-match'"));
console.log('BoxStudio V0.36 hosted backend/auth/RBAC/immutable revision/audit tests passed');
