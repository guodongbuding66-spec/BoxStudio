import './prepare-codes.mjs';
import {cp,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'dist');
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['src','vendor','assets'])await cp(resolve(root,name),resolve(out,name),{recursive:true});
const html=(await readFile(resolve(root,'index.html'),'utf8')).replaceAll('="./src/','="/src/').replaceAll('="./vendor/','="/vendor/');
await writeFile(resolve(out,'index.html'),html);
const styles=[...html.matchAll(/href="(\/src\/[^"\s]+)"/g)].map(m=>m[1]);
const modules=[...html.matchAll(/src="(\/(?:src|vendor)\/[^"\s]+)"/g)].map(m=>m[1]);
for(const path of [...styles,...modules])if(!(await stat(resolve(out,'.'+path))).isFile())throw new Error('Missing production asset: '+path);
let commit=process.env.VERCEL_GIT_COMMIT_SHA||'';
if(!commit)try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
if(commit&&!/^[a-f0-9]{40}$/.test(commit))throw new Error('Invalid release commit');
await writeFile(resolve(out,'release.json'),JSON.stringify({version:pkg.version,commit,workspaces:['box','marks'],storage:'browser-local',builtAt:new Date().toISOString()},null,2)+'\n');
await writeFile(resolve(out,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /src/\nDisallow: /vendor/\n');
console.log(`Built BoxStudio ${pkg.version}: ${modules.length} scripts, ${styles.length} styles; public output contains only app assets.`);
