import assert from 'node:assert/strict';
import { loadOutputIcc, clearOutputIcc } from '../src/iccRegistry.js';
import { collectWorkerAssets, transferableWorkerAssets, workerAssetAvailability } from '../src/workerAssets.js';
import { workerBatchEligibility } from '../src/batchWorkerCore.js';
import { analyzeObjectLevelMerge, applyObjectLevelResolutions } from '../src/projectMergeV2.js';
import { buildPanelArtworkPlan, buildArtworkAtlas, artworkPlanBounds } from '../src/panelArtwork.js';

function fakeCmykIcc(){const b=new Uint8Array(128);const size=128;b[0]=size>>>24;b[1]=size>>>16;b[2]=size>>>8;b[3]=size;for(const [off,text] of [[12,'prtr'],[16,'CMYK'],[20,'XYZ '],[36,'acsp']])for(let i=0;i<4;i++)b[off+i]=text.charCodeAt(i);b[8]=4;b[9]=0x20;return b;}

clearOutputIcc();loadOutputIcc(fakeCmykIcc(),'CI CMYK.icc');
const assets=collectWorkerAssets(),availability=workerAssetAvailability(assets);assert.equal(availability.hasIcc,true);assert.equal(availability.iccName,'CI CMYK.icc');
const transferred=transferableWorkerAssets(assets);assert.ok(transferred.payload.icc.bytes instanceof ArrayBuffer);assert.equal(transferred.transfer.length,1);
assert.equal(workerBatchEligibility({exportOptions:{pdfxMode:'pdfx4'}},availability).ok,true);
assert.equal(workerBatchEligibility({exportOptions:{outlineText:true,fontMode:'ttf'}},availability).ok,false);
clearOutputIcc();

const base={elements:[{id:'sku',x:10,y:10,w:100},{id:'crn',x:5,y:5}],masterTemplates:[],productionJobs:[],customCustomerProfiles:{acme:{id:'acme',label:'ACME',country:'US'}},customPackagingRules:{},customMarkTemplates:{},customMarkAssets:{},projectName:'A',structure:{k:1},variables:{sku:'A'},hiddenGroups:{},lockedGroups:{},lockedVariables:[],customerProfileId:'acme',packagingRuleProfileId:'p',markTemplateId:'m',exportOptions:{spot:true},repairTolerance:.5,activeProductionJobId:null,batch:{rows:[]}};
const local=structuredClone(base),remote=structuredClone(base);local.elements[0].x=20;remote.elements[0].y=30;local.customCustomerProfiles.acme.label='ACME Local';remote.customCustomerProfiles.acme.country='CA';
let analysis=analyzeObjectLevelMerge({baseState:base,localState:local,remoteState:remote});assert.equal(analysis.conflicts.length,0);assert.equal(analysis.merged.elements.find(e=>e.id==='sku').x,20);assert.equal(analysis.merged.elements.find(e=>e.id==='sku').y,30);assert.equal(analysis.merged.customCustomerProfiles.acme.label,'ACME Local');assert.equal(analysis.merged.customCustomerProfiles.acme.country,'CA');
remote.elements[0].x=40;analysis=analyzeObjectLevelMerge({baseState:base,localState:local,remoteState:remote});assert.ok(analysis.conflicts.some(c=>c.path==='elements[sku].x'));let applied=applyObjectLevelResolutions(analysis,{'elements[sku].x':'remote'});assert.equal(applied.unresolved.length,0);assert.equal(applied.state.elements.find(e=>e.id==='sku').x,40);assert.equal(applied.state.elements.find(e=>e.id==='sku').y,30);

const svgMark={schema:'boxstudio-svg-mark',schemaVersion:1,name:'logo',width:10,height:10,segmentCount:2,lines:[{x1:0,y1:0,x2:10,y2:0},{x1:10,y1:0,x2:10,y2:10}]};
const state={variables:{sku:'ABC',qrValue:'ABC',packageCount:'1',packageIndex:'1'},elements:[{id:'txt',type:'text',panelId:'front',x:5,y:5,w:50,h:10,template:'SKU {{sku}}',fontSize:5},{id:'logo',type:'svg-symbol',panelId:'front',x:20,y:20,w:40,h:40,r:0,svgMark},{id:'code',type:'barcode-qr-group',panelId:'front',x:70,y:10,w:100,h:40,barcodeType:'CODE39',barcodeValue:'{{sku}}',qrValue:'{{qrValue}}'}]};
const geo={panelMap:{front:{id:'front',label:'Front',x:0,y:0,w:200,h:100}}};const plan=buildPanelArtworkPlan(state,geo,'front');assert.equal(plan.elements,3);assert.ok(plan.commands.some(c=>c.source==='logo'&&c.type==='line'));assert.ok(plan.commands.filter(c=>c.source==='code').length>20);assert.equal(artworkPlanBounds(plan).ok,true);const atlas=buildArtworkAtlas(state,geo);assert.equal(atlas.panelCount,1);assert.equal(atlas.outside.length,0);

console.log('BoxStudio V0.16 regression tests passed');
