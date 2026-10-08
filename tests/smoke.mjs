import fs from 'node:fs';
import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { defaultsForTemplate, generateGeometry, elementInsideSafeArea, offsetPolygon, pointInPolygon } from '../src/geometry.js';
import { buildFoldGraph } from '../src/foldgraph.js';
import { barcodeLayout, validateBarcode, validateGS1Data } from '../src/barcode.js';
import { parseDxfDieline, parseTransform, applyMatrix, inferFoldCandidates, flattenCurves } from '../src/importDieline.js';
import { parsePdfAiBytes } from '../src/pdfAiImport.js';
import { buildProductionPdf, buildMultiPagePdf, buildDxf, pdfxCandidateIssues } from '../src/export.js';
import { analyzeImportedGeometry, repairImportedGeometry, splitPanel, mergePanels, addPolygonPanel, updatePolygonPanel, polygonSelfIntersections } from '../src/repair.js';
import { supportsVectorText, vectorTextRects } from '../src/vectorText.js';
import { STANDARD_TEMPLATE_CATALOG } from '../src/templates.js';
import { parseTrueTypeFont, textOutlineCommands, commandsToSvgPath } from '../src/ttfOutline.js';
import { loadUserTtf, clearUserTtf } from '../src/fontRegistry.js';
import { loadOutputIcc, clearOutputIcc, parseIccProfile } from '../src/iccRegistry.js';

for (const t of ['side-seal-rsc','mailer-150010']) {
  const geo=generateGeometry(defaultsForTemplate(t));
  const graph=buildFoldGraph(geo);
  assert.ok(graph.nodes.length>0);
  assert.ok(graph.edges.length>0);
  assert.equal(graph.edges.filter(e=>!e.hinge).length,0);
  assert.ok(geo.bleedRects.length>0 && geo.safeRects.length>0);
}
assert.deepEqual([generateGeometry(defaultsForTemplate('mailer-150010')).width,generateGeometry(defaultsForTemplate('mailer-150010')).height],[576,590]);

const samples=[['CODE39','ABC-123'],['EAN13','4006381333931'],['UPCA','036000291452'],['ITF14','10012345000017'],['GS1_128','(01)09501101530003(10)ABC123']];
for (const [type,value] of samples) {assert.equal(validateBarcode(type,value).ok,true,`${type} should validate`);assert.ok(barcodeLayout(type,value,100,30).bars.length>0,`${type} should generate bars`)}
assert.equal(validateBarcode('EAN13','4006381333932').ok,false);
assert.equal(validateGS1Data('(01)09501101530003(17)271231(10)LOT-88').ok,true);
assert.equal(validateGS1Data('(01)09501101530004(10)LOT').ok,false);
assert.equal(validateGS1Data('(17)271332').ok,false);

const m=parseTransform('translate(10 20) scale(2)'),pt=applyMatrix(m,5,6);assert.deepEqual(pt.map(v=>Math.round(v)),[20,32]);
const mr=parseTransform('rotate(90)'),rp=applyMatrix(mr,10,0);assert.ok(Math.abs(rp[0])<1e-6&&Math.abs(rp[1]-10)<1e-6);
const arcLines=flattenCurves([{type:'A',kind:'CUT',x1:0,y1:0,rx:50,ry:30,rotation:20,largeArc:0,sweep:1,x2:80,y2:40}],12);assert.ok(arcLines.length>=4);assert.ok(Math.abs(arcLines.at(-1).x2-80)<1e-6);

const panels=[{id:'p1',x:0,y:0,w:100,h:80},{id:'p2',x:100,y:0,w:100,h:80},{id:'p3',x:200,y:0,w:100,h:80}],creases=[{x1:100,y1:0,x2:100,y2:80},{x1:200,y1:0,x2:200,y2:80}];
const cand=inferFoldCandidates(panels,creases);assert.equal(cand.length,2);cand[0].confirmed=true;cand[1].confirmed=true;cand[1].angle=-90;
const importedState=defaultsForTemplate('imported');importedState.length=300;importedState.width=80;importedState.importedGeometry={width:300,height:80,panels,cutLines:[],creaseLines:creases,perfLines:[],glueLines:[],cutCurves:[],creaseCurves:[],perfCurves:[],glueCurves:[],foldCandidates:cand,foldRoot:'p1',source:'TEST'};
const importedGeo=generateGeometry(importedState),importedGraph=buildFoldGraph(importedGeo);assert.equal(importedGraph.edges.length,2);assert.equal(importedGraph.root,'p1');assert.equal(importedGraph.unreached.length,0);

const broken={panels:structuredClone(panels),cutLines:[{x1:0,y1:0,x2:100,y2:0},{x1:.1,y1:.1,x2:100.1,y2:.1},{x1:50,y1:50,x2:50.01,y2:50.01}],creaseLines:structuredClone(creases),perfLines:[],glueLines:[],warnings:[]};
const health=analyzeImportedGeometry(broken,.5);assert.ok(health.degenerate>=1&&health.nearEndpointPairs>=1);const fixed=repairImportedGeometry(broken,.5);assert.ok(fixed.cutLines.length<broken.cutLines.length);assert.ok(fixed.foldCandidates.length>=2);
const crossing={panels:[],cutLines:[{x1:0,y1:0,x2:100,y2:100},{x1:0,y1:100,x2:100,y2:0}],creaseLines:[],perfLines:[],glueLines:[]};assert.equal(analyzeImportedGeometry(crossing,.2).cutIntersections,1);
assert.equal(polygonSelfIntersections([[0,0],[100,100],[0,100],[100,0]]),1);
let polySrc=addPolygonPanel({panels:[],creaseLines:[],cutLines:[],perfLines:[],glueLines:[]},[[10,10],[90,10],[110,50],[60,90],[10,60]]);assert.equal(polySrc.panels[0].points.length,5);polySrc=updatePolygonPanel(polySrc,polySrc.panels[0].id,[[10,10],[80,10],[80,80],[10,80]]);assert.equal(polySrc.panels[0].w,70);
const polyGuide=offsetPolygon([[0,0],[100,0],[100,80],[0,80]],-5);assert.ok(pointInPolygon(50,40,polyGuide));
const split=splitPanel({...fixed,panels:[{id:'a',label:'A',x:0,y:0,w:100,h:80,kind:'panel'}]},'a','vertical',.5);assert.equal(split.panels.length,2);const merged=mergePanels(split,split.panels.map(p=>p.id));assert.equal(merged.panels.length,1);

assert.equal(supportsVectorText('SKU: ABC-123 / 1'),true);assert.equal(supportsVectorText('中文'),false);assert.ok(vectorTextRects('ABC',0,0,7).length>10);
assert.ok(STANDARD_TEMPLATE_CATALOG.some(t=>t.standard==='FEFCO'&&t.code==='0201'&&t.status==='implemented'));assert.ok(STANDARD_TEMPLATE_CATALOG.some(t=>t.standard==='ECMA'&&t.status==='schema-only'));

const dxfSample=fs.readFileSync(new URL('../assets/sample-dieline.dxf',import.meta.url),'utf8'),parsed=parseDxfDieline(dxfSample);assert.equal(parsed.cutLines.length,4);assert.equal(parsed.creaseLines.length,2);assert.equal(parsed.panels.length,3);assert.ok(parsed.foldCandidates.length>=2);
const pdfSample=new Uint8Array(fs.readFileSync(new URL('../assets/sample-dieline.pdf',import.meta.url))),pdfParsed=await parsePdfAiBytes(pdfSample,'sample-dieline.pdf');assert.ok(pdfParsed.cutLines.length>10);assert.ok(pdfParsed.creaseLines.length>0);assert.ok(pdfParsed.spotNames.includes('CutContour'));
const aiParsed=await parsePdfAiBytes(pdfSample,'sample-dieline.ai');assert.equal(aiParsed.source,'AI / PDF-compatible');

const g=generateGeometry(defaultsForTemplate('side-seal-rsc'));assert.equal(elementInsideSafeArea({panelId:'front',x:10,y:10,w:20,h:20},g),true);assert.equal(elementInsideSafeArea({panelId:'front',x:0,y:0,w:20,h:20},g),false);

const s1=structuredClone(defaultState),s2=structuredClone(defaultState),s3=structuredClone(defaultState);s2.variables.sku='TEST-SKU-002';s2.variables.qrValue='TEST-SKU-002';s2.variables.packageIndex='2';s3.variables.sku='TEST-SKU-003';s3.variables.qrValue='TEST-SKU-003';s3.variables.packageIndex='3';
const one=buildProductionPdf(s1),multi=buildMultiPagePdf([s1,s2,s3]),pdfText=new TextDecoder('latin1').decode(one);assert.ok(one.length>1000&&pdfText.startsWith('%PDF-1.6'));assert.ok(multi.length>one.length);assert.ok(pdfText.includes('/Separation /CutContour'));assert.ok(pdfText.includes('/Separation /Crease'));assert.ok(pdfText.includes('/OP true'));
const outlined=structuredClone(s1);outlined.exportOptions={...outlined.exportOptions,outlineText:true,fontMode:'technical'};const outPdf=buildProductionPdf(outlined),outText=new TextDecoder('latin1').decode(outPdf);assert.ok(outPdf.length>1000);assert.equal(outText.includes(' BT '),false);
const customSpot=structuredClone(s1);customSpot.exportOptions={...customSpot.exportOptions,spotNames:{CUT:'KnifeLine',CREASE:'ScoreLine',PERF:'PerfLine',GLUE:'GlueLine'}};const customSpotText=new TextDecoder('latin1').decode(buildProductionPdf(customSpot));assert.ok(customSpotText.includes('/Separation /KnifeLine')&&customSpotText.includes('/Separation /ScoreLine'));
const testIcc=new Uint8Array(128);new DataView(testIcc.buffer).setUint32(0,128,false);for(const [at,text] of [[12,'prtr'],[16,'CMYK'],[20,'XYZ '],[36,'acsp']])for(let i=0;i<4;i++)testIcc[at+i]=text.charCodeAt(i);assert.equal(parseIccProfile(testIcc.buffer,'test-cmyk.icc').isCmyk,true);loadOutputIcc(testIcc.buffer,'test-cmyk.icc');const candidate=structuredClone(s1);candidate.exportOptions={...candidate.exportOptions,pdfxMode:'candidate',outlineText:true,fontMode:'technical',outputConditionIdentifier:'TEST-CMYK'};assert.deepEqual(pdfxCandidateIssues(candidate),[]);const candidatePdf=buildProductionPdf(candidate),candidateText=new TextDecoder('latin1').decode(candidatePdf);assert.ok(candidateText.includes('/OutputIntents'));assert.ok(candidateText.includes('/DestOutputProfile'));assert.ok(candidateText.includes('/GTS_PDFXVersion (PDF/X-4)'));assert.ok(candidateText.includes('<pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>'));assert.equal(candidateText.includes('/BaseFont /Helvetica'),false);clearOutputIcc();assert.ok(pdfxCandidateIssues(candidate).length>0);
const dxf=buildDxf(s1);assert.ok(dxf.includes('CUT')&&dxf.includes('CREASE'));

const curveState=structuredClone(defaultState);curveState.structure=defaultsForTemplate('imported');curveState.structure.length=200;curveState.structure.width=100;curveState.structure.importedGeometry={width:200,height:100,panels:[{id:'artboard',label:'Artboard',x:0,y:0,w:200,h:100,kind:'panel'}],cutLines:[],creaseLines:[],perfLines:[],glueLines:[],cutCurves:[{type:'C',kind:'CUT',x1:10,y1:50,c1x:40,c1y:0,c2x:160,c2y:100,x2:190,y2:50}],creaseCurves:[],perfCurves:[],glueCurves:[],foldCandidates:[],foldRoot:'artboard',source:'TEST'};assert.ok(buildDxf(curveState).split('\r\n').filter(x=>x==='LINE').length>5);assert.throws(()=>buildProductionPdf(curveState),/安全区/);curveState.elements=[];assert.ok(buildProductionPdf(curveState).length>500);

const fontPath='/usr/share/fonts/truetype/lato/Lato-Medium.ttf';if(fs.existsSync(fontPath)){const fb=fs.readFileSync(fontPath),ab=fb.buffer.slice(fb.byteOffset,fb.byteOffset+fb.byteLength),font=parseTrueTypeFont(ab,'Lato-Medium.ttf'),cmds=textOutlineCommands(font,'SKU ABC-123',0,0,7);assert.ok(font.numGlyphs>1000);assert.ok(cmds.length>100);assert.ok(commandsToSvgPath(cmds).includes('Q'));loadUserTtf(ab,'Lato-Medium.ttf');const exact=structuredClone(s1);exact.exportOptions={...exact.exportOptions,outlineText:true,fontMode:'ttf'};const exactPdf=new TextDecoder('latin1').decode(buildProductionPdf(exact));assert.equal(exactPdf.includes(' BT '),false);clearUserTtf()}

console.log('BoxStudio V0.8 smoke tests passed');
