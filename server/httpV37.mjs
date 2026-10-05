import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { BackendError } from './domainV36.mjs';
import { createHostedBackendV37 } from './domainV37.mjs';
import { applyMigrationsV37, cleanupExpiredSessionsV37, createPostgresPoolV37, seedUsersV37 } from './postgresV37.mjs';

const jsonHeaders={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function send(res,status,body,extra={}){res.writeHead(status,{...jsonHeaders,...extra});res.end(body==null?'':JSON.stringify(body));}
function routeParts(url){const parsed=new URL(url,'http://localhost');return{pathname:parsed.pathname,parts:parsed.pathname.split('/').filter(Boolean),search:parsed.searchParams};}
function bearer(req){const value=String(req.headers.authorization||'');return value.toLowerCase().startsWith('bearer ')?value.slice(7).trim():'';}
function idempotencyKey(req){return String(req.headers['idempotency-key']||'').trim();}
async function bodyJson(req,{limit=2_000_000}={}){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw new BackendError('Request body exceeds 2 MB.',{status:413,code:'BODY_TOO_LARGE'});chunks.push(chunk);}if(!chunks.length)return{};try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new BackendError('Request body must be valid JSON.',{code:'JSON_INVALID'});}}
function sameOriginHeaders(req,{allowedOrigins=[]}={}){const origin=String(req.headers.origin||''),allow=allowedOrigins.includes('*')?'*':(allowedOrigins.includes(origin)?origin:'');return allow?{'access-control-allow-origin':allow,'access-control-allow-headers':'authorization,content-type,if-match,idempotency-key','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','vary':'Origin'}:{};}

export function createV37RequestHandler(service,{allowedOrigins=[]}={}){
  if(!service)throw new Error('V0.37 HTTP handler requires a backend service.');
  return async function handle(req,res){const cors=sameOriginHeaders(req,{allowedOrigins});if(req.method==='OPTIONS'){res.writeHead(204,{...cors,'access-control-max-age':'600'});res.end();return;}
    try{const {pathname,parts,search}=routeParts(req.url||'/');if(pathname==='/healthz'){send(res,200,await service.health(),cors);return;}if(parts[0]!=='api'||parts[1]!=='v1'){send(res,404,{error:'NOT_FOUND',message:'API route not found.'},cors);return;}const token=bearer(req),tail=parts.slice(2),idem=idempotencyKey(req);
      if(req.method==='POST'&&tail.join('/')==='auth/login'){send(res,200,await service.login(await bodyJson(req)),cors);return;}
      if(req.method==='POST'&&tail.join('/')==='auth/logout'){send(res,200,await service.logout(token),cors);return;}
      if(req.method==='GET'&&tail.join('/')==='session'){send(res,200,await service.getSession(token),cors);return;}
      if(req.method==='GET'&&tail.join('/')==='projects'){send(res,200,{projects:await service.listProjects(token)},cors);return;}
      if(req.method==='POST'&&tail.join('/')==='projects'){send(res,201,await service.createProject(token,await bodyJson(req),{idempotencyKey:idem}),cors);return;}
      if(req.method==='GET'&&tail.join('/')==='audit'){send(res,200,{events:await service.getAudit(token,{projectId:search.get('projectId')||null,afterSeq:Number(search.get('afterSeq')||0)})},cors);return;}
      if(req.method==='GET'&&tail.join('/')==='audit/verify'){send(res,200,await service.verifyAudit(token),cors);return;}
      if(tail[0]==='projects'&&tail[1]){const projectId=decodeURIComponent(tail[1]);if(req.method==='GET'&&tail.length===2){send(res,200,await service.getProject(token,projectId),cors);return;}if(tail[2]==='revisions'){
          if(req.method==='GET'&&tail.length===3){send(res,200,{revisions:await service.listRevisions(token,projectId)},cors);return;}
          if(req.method==='POST'&&tail.length===3){const body=await bodyJson(req),header=req.headers['if-match'],expectedRevision=header==null?body.expectedRevision:Number(String(header).replace(/^W\//,'').replaceAll('"',''));send(res,201,await service.createRevision(token,projectId,{...body,expectedRevision},{idempotencyKey:idem}),cors);return;}
          const revision=Number(tail[3]);if(Number.isInteger(revision)&&revision>0){if(req.method==='GET'&&tail.length===4){send(res,200,await service.getRevision(token,projectId,revision),cors);return;}if(tail[4]==='archive'&&tail.length===5){if(req.method==='POST'){send(res,201,await service.createProductionArchive(token,projectId,revision,await bodyJson(req),{idempotencyKey:idem}),cors);return;}if(req.method==='GET'){send(res,200,await service.getProductionArchive(token,projectId,revision),cors);return;}}
            if(req.method==='POST'&&tail.length===5){const body=await bodyJson(req),action=tail[4],options={idempotencyKey:idem};if(action==='submit'){send(res,200,await service.submitRevision(token,projectId,revision,body,options),cors);return;}if(action==='approve'){send(res,200,await service.approveRevision(token,projectId,revision,body,options),cors);return;}if(action==='reject'){send(res,200,await service.rejectRevision(token,projectId,revision,body,options),cors);return;}if(action==='production-gate'){send(res,200,await service.productionGate(token,projectId,revision),cors);return;}}
          }
        }}
      send(res,404,{error:'NOT_FOUND',message:'API route not found.'},cors);
    }catch(error){const status=Number(error?.status)||500,code=error?.code||'INTERNAL_ERROR',message=status>=500?'Internal server error.':String(error?.message||error);send(res,status,{error:code,message,detail:error?.detail??null},cors);if(status>=500)console.error('[BoxStudio V0.37]',error);}
  };
}

export async function createV37HttpRuntime({service,pool,connectionString,users=[],sessionTtlMs,allowedOrigins=[],ssl=false}={}){
  const ownsPool=!pool,actualPool=pool||await createPostgresPoolV37({connectionString,ssl});
  await applyMigrationsV37(actualPool);if(users.length)await seedUsersV37(actualPool,users);await cleanupExpiredSessionsV37(actualPool);
  const backend=service||createHostedBackendV37({pool:actualPool,sessionTtlMs}),handler=createV37RequestHandler(backend,{allowedOrigins}),server=createServer(handler);
  return{service:backend,pool:actualPool,server,listen({port=8787,host='127.0.0.1'}={}){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);const address=server.address(),actualPort=typeof address==='object'&&address?address.port:port;resolve({host,port:actualPort,url:`http://${host}:${actualPort}`});});});},async close({endPool=ownsPool}={}){if(server.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));if(endPool)await actualPool.end();}};
}

export function usersFromEnvV37(env=process.env){const raw=String(env.BOXSTUDIO_USERS_JSON||'').trim();if(!raw)throw new Error('BOXSTUDIO_USERS_JSON is required; V0.37 does not ship default credentials.');const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.length)throw new Error('BOXSTUDIO_USERS_JSON must be a non-empty JSON array.');return parsed;}

async function main(){const users=usersFromEnvV37(),connectionString=String(process.env.BOXSTUDIO_DATABASE_URL||''),port=Math.max(1,Number(process.env.PORT||process.env.BOXSTUDIO_PORT||8787)),host=String(process.env.BOXSTUDIO_HOST||'0.0.0.0'),allowedOrigins=String(process.env.BOXSTUDIO_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean),ssl=String(process.env.BOXSTUDIO_DATABASE_SSL||'').toLowerCase()==='true',runtime=await createV37HttpRuntime({connectionString,users,allowedOrigins,ssl});const info=await runtime.listen({port,host});console.log(`BoxStudio V0.37 durable API listening at ${info.url}`);}
const invoked=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(invoked)main().catch(error=>{console.error(error);process.exitCode=1;});
