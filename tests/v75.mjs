import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARTWORK_CATALOG_V75,createArtworkV74,artworkPrimitivesV74,artworkSvgV74,artworkPdfV74} from '../src/artworkLibraryV74.js';
import {FONTS_V74,registerFontV74,fontTextSvgV74,fontGlyphIssuesV74} from '../src/fontSystemV74.js';
import {actionableTemplatesV47} from '../src/productExperienceV47.js';
import {DESIGN_PRESETS_V71} from '../src/designTemplatesV71.js';
import {LIGHT_RIGS_V74} from '../src/studioLightingV74.js';
import {PAPER_FINISHES_V75,studioSettingsV75,outputDimensionsV75} from '../src/studioConfigV75.js';
import {createMarkDocumentV67,buildMarkSvgV67,buildMarkPdfV67,parseMarkDocumentV67} from '../src/standaloneMarksV67.js';
let checks=0;const check=(v,message)=>{assert.ok(v,message);checks++;};mkdirSync('artifacts/v75',{recursive:true});
check(ARTWORK_CATALOG_V75.length===1544,'Complete pinned Lucide inventory');check(new Set(ARTWORK_CATALOG_V75.map(r=>r.id)).size===1544,'Unique actual originals');
for(const r of ARTWORK_CATALOG_V75){const original=readFileSync('assets/artwork-v75/'+r.id+'.svg');check(createHash('sha256').update(original).digest('hex')===r.sha256,'Original SVG hash '+r.id);const e=createArtworkV74(r.id,{id:'label',w:320,h:220}),paths=artworkPrimitivesV74(e);check(paths.length>0&&paths.every(p=>p.ops.every(([op,...v])=>['M','L','C','Z'].includes(op)&&v.every(Number.isFinite))),'Finite shared curves '+r.id);check(artworkSvgV74(e).includes('<path')&&artworkPdfV74(e,0,0,220,72/25.4).length>2,'SVG and native PDF have original paths '+r.id);}
check(readFileSync('assets/artwork-v75/LICENSE','utf8').includes('ISC'),'Original ISC license included');
check(FONTS_V74.length===12,'Twelve real font families');const sources=JSON.parse(readFileSync('assets/fonts-v74/sources.json','utf8'));check(sources.length===24,'24 real weights');for(const r of sources){const bytes=readFileSync('assets/fonts-v74/'+r.file);check(createHash('sha256').update(bytes).digest('hex')===r.sha256,'Exact font source hash '+r.file);registerFontV74(r.id,r.weight,bytes);}
for(const f of FONTS_V74){const e={fontIdV74:f.id,fontSize:8},normal=fontTextSvgV74(e,'PACKAGING / 2026'),bold=fontTextSvgV74({...e,bold:true},'PACKAGING / 2026');check(normal?.includes('<path')&&bold!==normal,'Real regular/bold outlines '+f.id);}
check(fontGlyphIssuesV74({fontIdV74:'playfair'},'纸盒').length>0,'Latin font does not silently replace Chinese');
let mark=createMarkDocumentV67('blank');mark.elements=[{...createArtworkV74('paw-print',{id:'label',w:320,h:220}),group:'marks',x:20,y:20},{id:'type',type:'text',group:'marks',panelId:'label',x:80,y:30,w:210,h:32,r:0,template:'PACKAGING / 2026',fontIdV74:'playfair',fontSize:8}];check(parseMarkDocumentV67(JSON.stringify(mark)).elements[0].assetIdV74==='paw-print','New resources survive project round trip');writeFileSync('artifacts/v75/resource-proof.svg',buildMarkSvgV67(mark));writeFileSync('artifacts/v75/resource-proof.pdf',buildMarkPdfV67(mark));
check(actionableTemplatesV47().length===32,'Thirty-two executable structures');check(DESIGN_PRESETS_V71.length===32,'Thirty-two editable templates');check(Object.keys(LIGHT_RIGS_V74).length===8,'Eight physical light rigs');check(Object.keys(PAPER_FINISHES_V75).length===6,'Six physical paper appearances');
for(const ratio of ['4:3','3:4','16:9','9:16','1:1']){const [w,h]=outputDimensionsV75(4096,ratio);check(Math.max(w,h)===4096,'4K long edge '+ratio);check(Math.abs(w/h-Number(ratio.split(':')[0])/Number(ratio.split(':')[1]))<.001,'Actual output geometry '+ratio);}
const s=studioSettingsV75({projection:'fake',finish:'fake',pedestal:'fake',fov:200,shadowOpacity:-2,backgroundImage:'https://invalid.test/pixel.png'});check(s.projection==='perspective'&&s.finish==='paper'&&s.pedestal==='none'&&s.fov===80&&s.shadowOpacity===0&&!s.backgroundImage,'Studio input is bounded and self-contained');
writeFileSync('artifacts/v75/model-results.json',JSON.stringify({status:'PASS',checks,assets:1544,fontFamilies:12,weights:24,structures:32,designs:32,lightRigs:8,finishes:6},null,2));console.log('PASS V0.75: '+checks+' source, vector, font and studio assertions');
