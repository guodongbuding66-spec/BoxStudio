import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { createHostedApiV36 } from '../src/hostedClientV36.js';
import { sha256JsonV36 } from '../server/domainV36.mjs';
import { createHostedBackendV37 } from '../server/domainV37.mjs';
import { applyMigrationsV37, createPostgresPoolV37, seedUsersV37 } from '../server/postgresV37.mjs';
import { createV37HttpRuntime } from '../server/httpV37.mjs';

const connectionString=process.env.BOXSTUDIO_DATABASE_URL;if(!connectionString)throw new Error('BOXSTUDIO_DATABASE_URL is required for V0.37 tests.');
const users=[
  {id:'alice',email:'alice@example.test',name:'Alice Operator',role:'operator',password:'operator-test-1234'},
  {id:'bob',email:'bob@example.test',name:'Bob Approver',role:'approver',password:'approver-test-1234'},
  {id:'root',email:'root@example.test',name:'Root Admin',role:'admin',password:'admin-test-12345'},
];
const pool=await createPostgresPoolV37({connectionString});
try{
  const migrated=await applyMigrationsV37(pool);assert.equal(migrated.applied,true);const migratedAgain=await applyMigrationsV37(pool);assert.equal(migratedAgain.applied,false);assert.equal(migratedAgain.checksum,migrated.checksum);
  await seedUsersV37(pool,users);
  const service=createHostedBackendV37({pool});
  const health=await service.health();assert.equal(health.ok,true);assert.equal(health.durable,true);assert.equal(health.migration.version,'001_v37');
  const alice=await service.login({email:'alice@example.test',password:'operator-test-1234'}),bob=await service.login({email:'bob@example.test',password:'approver-test-1234'}),root=await service.login({email:'root@example.test',password:'admin-test-12345'});
  assert.equal((await service.getSession(alice.token)).user.role,'operator');

  const source=structuredClone(defaultState);source.projectName='Durable V37';source.variables.sku='PG-001';
  const created=await service.createProject(alice.token,{id:'durable-demo',name:'Durable Demo',state:source,reason:'initial durable revision'},{idempotencyKey:'create-durable-demo'});
  const replay=await service.createProject(alice.token,{id:'durable-demo',name:'Durable Demo',state:source,reason:'initial durable revision'},{idempotencyKey:'create-durable-demo'});
  assert.equal(replay.currentRevision,1);assert.equal(replay.revision.snapshotHash,created.revision.snapshotHash);
  await assert.rejects(()=>service.createProject(alice.token,{id:'different-demo',name:'Different',state:source},{idempotencyKey:'create-durable-demo'}),error=>error?.status===409&&error?.code==='IDEMPOTENCY_CONFLICT');
  let counts=await service._debugCounts();assert.equal(counts.hosted_projects,1);assert.equal(counts.artwork_revisions,1);assert.equal(counts.idempotency_records,1);

  await service.submitRevision(alice.token,'durable-demo',1,{reason:'ready'},{idempotencyKey:'submit-r1'});
  const approved=await service.approveRevision(bob.token,'durable-demo',1,{reason:'approved'},{idempotencyKey:'approve-r1'});assert.equal(approved.workflow.status,'approved');
  const archive=await service.createProductionArchive(alice.token,'durable-demo',1,{reason:'release package'},{idempotencyKey:'archive-r1'});assert.equal(archive.snapshotHash,created.revision.snapshotHash);assert.equal(archive.archiveHash,sha256JsonV36(archive.archive));
  const archiveReplay=await service.createProductionArchive(alice.token,'durable-demo',1,{reason:'release package'},{idempotencyKey:'archive-r1'});assert.equal(archiveReplay.archiveHash,archive.archiveHash);
  counts=await service._debugCounts();assert.equal(counts.production_archives,1);

  await assert.rejects(()=>pool.query("UPDATE artwork_revisions SET reason='tampered' WHERE project_id='durable-demo' AND revision=1"),error=>error?.code==='55000');
  await assert.rejects(()=>pool.query("DELETE FROM production_archives WHERE project_id='durable-demo' AND revision=1"),error=>error?.code==='55000');
  assert.equal((await service.getRevision(alice.token,'durable-demo',1)).snapshot.variables.sku,'PG-001');

  const next=structuredClone(source);next.variables.sku='PG-002';
  const rev2=await service.createRevision(alice.token,'durable-demo',{state:next,expectedRevision:1,reason:'second revision'},{idempotencyKey:'rev2'});
  const rev2Replay=await service.createRevision(alice.token,'durable-demo',{state:next,expectedRevision:1,reason:'second revision'},{idempotencyKey:'rev2'});assert.equal(rev2Replay.revision,2);assert.equal(rev2.revision,2);
  const a=structuredClone(next),b=structuredClone(next);a.variables.sku='PG-RACE-A';b.variables.sku='PG-RACE-B';
  const raced=await Promise.allSettled([
    service.createRevision(alice.token,'durable-demo',{state:a,expectedRevision:2,reason:'race a'},{idempotencyKey:'race-a'}),
    service.createRevision(alice.token,'durable-demo',{state:b,expectedRevision:2,reason:'race b'},{idempotencyKey:'race-b'}),
  ]);
  assert.equal(raced.filter(x=>x.status==='fulfilled').length,1);assert.equal(raced.filter(x=>x.status==='rejected'&&x.reason?.status===409).length,1);assert.equal((await service.getProject(alice.token,'durable-demo')).currentRevision,3);

  const persistedService=createHostedBackendV37({pool});assert.equal((await persistedService.getSession(alice.token)).user.id,'alice');assert.equal((await persistedService.getProject(alice.token,'durable-demo')).currentRevision,3);
  const auditCheck=await service.verifyAudit(root.token);assert.equal(auditCheck.ok,true);assert.ok(auditCheck.count>=8);

  const storageMap=new Map(),storage={getItem:key=>storageMap.get(key)||null,setItem:(key,value)=>storageMap.set(key,String(value)),removeItem:key=>storageMap.delete(key)};
  const runtime1=await createV37HttpRuntime({pool,users}),info1=await runtime1.listen({port:0,host:'127.0.0.1'});const api1=createHostedApiV36({baseUrl:`${info1.url}/api/v1`,storage});await api1.login('alice@example.test','operator-test-1234');const httpState=structuredClone(defaultState);httpState.projectName='HTTP Durable';httpState.variables.sku='HTTP-PG-001';const httpCreated=await api1.createProject({id:'http-durable',name:'HTTP Durable',state:httpState},{idempotencyKey:'http-create'});const httpReplay=await api1.createProject({id:'http-durable',name:'HTTP Durable',state:httpState},{idempotencyKey:'http-create'});assert.equal(httpCreated.revision.snapshotHash,httpReplay.revision.snapshotHash);await runtime1.close({endPool:false});
  const runtime2=await createV37HttpRuntime({pool,users}),info2=await runtime2.listen({port:0,host:'127.0.0.1'});try{const api2=createHostedApiV36({baseUrl:`${info2.url}/api/v1`,storage});assert.equal((await api2.session()).user.id,'alice');assert.equal((await api2.getProject('http-durable')).currentRevision,1);const httpHealth=await fetch(`${info2.url}/healthz`).then(r=>r.json());assert.equal(httpHealth.durable,true);}finally{await runtime2.close({endPool:false});}

  const finalCounts=await service._debugCounts();assert.equal(finalCounts.hosted_projects,2);assert.equal(finalCounts.production_archives,1);assert.ok(finalCounts.idempotency_records>=7);
  console.log('BoxStudio V0.37 durable PostgreSQL/idempotency/archive tests passed');
}finally{await pool.end();}
