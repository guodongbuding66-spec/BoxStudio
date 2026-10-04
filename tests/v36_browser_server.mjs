import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, extname, normalize } from 'node:path';
import { createHostedBackendV36 } from '../server/domainV36.mjs';
import { createV36RequestHandler } from '../server/httpV36.mjs';

const PORT=8768,ROOT=resolve(process.cwd());
const started='/tmp/boxstudio-v36-started',pass='/tmp/boxstudio-v36-pass',fail='/tmp/boxstudio-v36-fail';
await Promise.all([started,pass,fail].map(path=>unlink(path).catch(()=>{})));
const users=[
  {id:'alice',email:'alice@example.test',name:'Alice Operator',role:'operator',password:'operator-1234'},
  {id:'bob',email:'bob@example.test',name:'Bob Approver',role:'approver',password:'approver-1234'},
];
const service=createHostedBackendV36({users}),api=createV36RequestHandler(service);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
function signalPath(pathname){if(pathname==='/__v36_started__')return started;if(pathname==='/__v36_pass__')return pass;if(pathname==='/__v36_fail__')return fail;return null;}
const server=createServer(async(req,res)=>{
  const parsed=new URL(req.url||'/','http://localhost'),signal=signalPath(parsed.pathname);
  if(signal){await writeFile(signal,parsed.searchParams.get('detail')||parsed.searchParams.get('message')||'signal','utf8');res.writeHead(204);res.end();return;}
  if(parsed.pathname.startsWith('/api/')||parsed.pathname==='/healthz'){await api(req,res);return;}
  let pathname=decodeURIComponent(parsed.pathname);if(pathname==='/')pathname='/tests/v36-browser-e2e.html';const safe=normalize(pathname).replace(/^([.][.][/\\])+/,''),file=resolve(ROOT,`.${safe}`);if(!file.startsWith(ROOT)){res.writeHead(403);res.end('forbidden');return;}
  try{const bytes=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end('not found');}
});
server.listen(PORT,'127.0.0.1',()=>console.log(`V0.36 browser E2E server http://127.0.0.1:${PORT}`));
