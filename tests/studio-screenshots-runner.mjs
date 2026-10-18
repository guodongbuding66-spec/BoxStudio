import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import puppeteer from 'puppeteer-core';

// Use a real browser clock and wait for actual application readiness. Chrome's
// CLI virtual-time screenshot mode can stall indefinitely on a live WebGL page.
const root=resolve('.'),output=resolve('artifacts/v65-screenshots');
const server=createServer((req,res)=>{const path=new URL(req.url,'http://local').pathname,file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))return res.writeHead(403).end();res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm'}[extname(file)]||'application/octet-stream'));const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await mkdir(output,{recursive:true});
let browser;const checks=[];
try{
 browser=await puppeteer.launch({executablePath:process.argv[2],timeout:90000,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const shot of ['templates','structure','artwork','marks','3d','preflight','export','manufacturing','factory','routing','mobile']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],name=shot==='mobile'?'mobile-artwork':shot;
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:shot==='mobile'?390:1280,height:shot==='mobile'?844:900});
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/tests/studio-screenshots.html?shot='+shot,{waitUntil:'load'});
   await page.waitForFunction(shot=>document.body.dataset.captureReady===shot||document.body.dataset.captureError,{},shot);
   const result=await page.evaluate(()=>({ready:document.body.dataset.captureReady,error:document.body.dataset.captureError}));assert.equal(result.error,undefined);assert.equal(result.ready,shot);
   if(shot==='3d')await page.waitForFunction(()=>document.querySelector('#threeCanvas canvas')?.dataset.renderer==='physical-webgl'&&window.BoxStudioV52?.getProof?.()?.getDebugState?.()?.renderCount>0);
   assert.deepEqual(errors,[],shot+' browser exceptions');
   await page.screenshot({path:output+'/'+name+'.png'});await writeFile(output+'/'+name+'.html',await page.content());checks.push({shot,status:'PASS',physical3d:shot==='3d'});console.log('PASS native full-entry screenshot:',shot);
  }catch(error){await page.screenshot({path:output+'/'+name+'-failure.png'}).catch(()=>{});await writeFile(output+'/'+name+'-failure.html',await page.content()).catch(()=>{});throw error;}
  finally{await context.close();}
 }
 await writeFile(output+'/results.json',JSON.stringify({status:'PASS',checks},null,2));
}finally{await browser?.close();server.close();}
