import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer-core';
const root=resolve('.'),out=resolve('artifacts/v82');await mkdir(out,{recursive:true});
const server=createServer((req,res)=>{const path=new URL(req.url,'http://local').pathname,file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/'))return res.writeHead(403).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff':'font/woff','.ttf':'font/ttf','.svg':'image/svg+xml','.wasm':'application/wasm'}[extname(file)]||'application/octet-stream'));const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.argv[2],headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking'],defaultViewport:null});
try{for(const [name,width,height]of [['desktop',1440,960],['mobile',390,844]]){
 const downloads=resolve(out,name+'-downloads');await mkdir(downloads,{recursive:true});
 const context=await browser.createBrowserContext({downloadBehavior:{policy:'allow',downloadPath:downloads}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width,height});
 try{await page.goto('http://127.0.0.1:'+server.address().port+'/tests/v82-browser-e2e.html',{waitUntil:'load'});await page.waitForFunction(()=>Boolean(document.body.dataset.v82Result),{timeout:120000,polling:100});const report=await page.evaluate(()=>JSON.parse(document.body.dataset.v82Result));await writeFile(resolve(out,name+'-results.json'),JSON.stringify(report,null,2));assert.equal(report.status,'PASS',report.error);assert.deepEqual(errors,[]);
  for(const expected of report.downloads){let actual;const end=Date.now()+10000;while(Date.now()<end){try{actual=await readFile(resolve(downloads,expected.name));if(createHash('sha256').update(actual).digest('hex')===expected.sha256)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(actual?.length,expected.size,'Native download length '+expected.name);assert.equal(createHash('sha256').update(actual).digest('hex'),expected.sha256,'Native download hash '+expected.name);}
  console.log('PASS '+name+': '+report.checks.length+' browser checks, '+report.downloads.length+' verified native downloads');
 }finally{await page.evaluate(()=>Promise.all((document.querySelector('dialog[open]')?.getAnimations()||[]).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:resolve(out,name+'.png')});await writeFile(resolve(out,name+'.html'),await page.content());await context.close();}
}}finally{await browser.close();server.close();}
