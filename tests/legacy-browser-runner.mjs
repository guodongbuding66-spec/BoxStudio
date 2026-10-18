import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import puppeteer from 'puppeteer-core';

// Keep the existing in-page assertions and independent HTML-result checker,
// while driving asynchronous fonts/canvas/WebGL with a real browser clock.
const [mode,view,chrome,output]=process.argv.slice(2);
assert.ok(['v65','live','v66','v67','v68','v69','v70'].includes(mode));assert.ok(['desktop','mobile'].includes(view));assert.ok(chrome&&output);
await mkdir(dirname(output),{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,timeout:90000,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:view==='mobile'?390:1280,height:view==='mobile'?844:900});
const key=mode==='live'?'liveArtworkResult':mode+'Result';
let report;
try{
 const signal=mode==='v65'?page.waitForResponse(r=>r.url().endsWith('/__v65_pass__')&&r.status()===204):null;signal?.catch(()=>{});
 await page.goto('http://127.0.0.1:8795/tests/'+(mode==='live'?'artwork-live.html':mode+'-browser-e2e.html'),{waitUntil:'load'});
 await page.waitForFunction(({mode,key})=>mode==='v65'?(document.body.dataset.pass||document.body.dataset.fail):document.body.dataset[key],{}, {mode,key});
 report=await page.evaluate(({mode,key})=>mode==='v65'?{status:document.body.dataset.pass?'PASS':'FAIL',message:document.body.dataset.pass||document.body.dataset.fail}:JSON.parse(document.body.dataset[key]),{mode,key});
 assert.equal(report.status,'PASS',JSON.stringify(report));if(signal)await signal;assert.deepEqual(errors,[],mode+' browser exceptions');
 console.log('PASS real-clock acceptance:',mode,view,Array.isArray(report.checks)?report.checks.length:report.message);
}finally{
 await writeFile(output,await page.content());await writeFile(output.replace(/\.(html|log)$/, '')+'.json',JSON.stringify({mode,view,report,errors},null,2));await page.screenshot({path:output.replace(/\.(html|log)$/, '')+'.png'}).catch(()=>{});await browser.close();
}
