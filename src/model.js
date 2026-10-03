import { defaultStructure, defaultsForTemplate } from './geometry.js';

export const STORAGE_KEY = 'boxstudio-mvp-v16';
export const LEGACY_STORAGE_KEYS = ['boxstudio-mvp-v15','boxstudio-mvp-v14','boxstudio-mvp-v13','boxstudio-mvp-v12','boxstudio-mvp-v11','boxstudio-mvp-v10','boxstudio-mvp-v9','boxstudio-mvp-v8','boxstudio-mvp-v7','boxstudio-mvp-v6','boxstudio-mvp-v5','boxstudio-mvp-v4','boxstudio-mvp-v3','boxstudio-mvp-v2','boxstudio-mvp'];

export const defaultVariables = {
  sku:'KF210215US-02PM-001',nw:'74.1',gw:'80.7',length:'47.24',width:'23.62',height:'7.87',dimensionUnit:'INCH',weightUnit:'LBS',crn:'3203960FM4',contractNo:'HT24010213',originCountry:'China',destinationCountry:'US',packageIndex:'1',packageCount:'3',qrValue:'KF210215US-02PM-001',
};

export const rscElements = [
  {id:'sku',type:'text',group:'marks',panelId:'front',x:60,y:32,w:520,h:32,r:0,template:'SKU: {{sku}}',fontSize:18,bold:true},
  {id:'weight',type:'text',group:'marks',panelId:'front',x:60,y:78,w:420,h:64,r:0,template:'N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',fontSize:16},
  {id:'measure',type:'text',group:'marks',panelId:'front',x:520,y:78,w:560,h:64,r:0,template:'Package Meas:\n{{length}}x{{width}}x{{height}} {{dimensionUnit}}',fontSize:16},
  {id:'crn1',type:'text',group:'marks',panelId:'front',x:60,y:150,w:360,h:28,r:0,template:'CRN: {{crn}}',fontSize:15,bold:true},
  {id:'contract',type:'text',group:'marks',panelId:'front',x:460,y:150,w:500,h:28,r:0,template:'Contract No.: {{contractNo}}',fontSize:15},
  {id:'origin',type:'text',group:'marks',panelId:'back',x:70,y:40,w:420,h:28,r:0,template:'Made in {{originCountry}}',fontSize:15},
  {id:'dest',type:'text',group:'marks',panelId:'back',x:70,y:82,w:180,h:28,r:0,template:'{{destinationCountry}}',fontSize:17,bold:true},
  {id:'crn2',type:'text',group:'marks',panelId:'back',x:350,y:82,w:360,h:28,r:0,template:'CRN: {{crn}}',fontSize:15,bold:true},
  {id:'barcodeQr',type:'barcode-qr-group',group:'marks',panelId:'right',x:55,y:38,w:250,h:80,r:0,barcodeValue:'{{sku}}',qrValue:'{{qrValue}}',preset:'250x80',lockAspect:true,barcodeType:'CODE39'},
  {id:'packageNotice',type:'notice',group:'marks',panelId:'front',x:540,y:28,w:610,h:48,r:0,template:'Please note the product has {{packageCount}} packages,\nand this is the package {{packageIndex}}',fontSize:14},
  {id:'thisSideUp',type:'icon',icon:'up',group:'marks',panelId:'left',x:55,y:32,w:48,h:48,r:0},
  {id:'fragile',type:'icon',icon:'fragile',group:'marks',panelId:'left',x:125,y:32,w:48,h:48,r:0},
  {id:'keepDry',type:'icon',icon:'dry',group:'marks',panelId:'left',x:195,y:32,w:48,h:48,r:0},
];

export const mailerElements = [
  {id:'sku',type:'text',group:'marks',panelId:'lid',x:18,y:18,w:180,h:22,r:0,template:'SKU: {{sku}}',fontSize:8,bold:true},
  {id:'origin',type:'text',group:'marks',panelId:'front',x:12,y:10,w:110,h:18,r:0,template:'Made in {{originCountry}}',fontSize:6},
  {id:'crn1',type:'text',group:'marks',panelId:'front',x:130,y:10,w:145,h:18,r:0,template:'CRN: {{crn}}',fontSize:6,bold:true},
  {id:'barcodeQr',type:'barcode-qr-group',group:'marks',panelId:'lid',x:25,y:58,w:200,h:64,r:0,barcodeValue:'{{sku}}',qrValue:'{{qrValue}}',preset:'200x64',lockAspect:true,barcodeType:'CODE39'},
  {id:'packageNotice',type:'notice',group:'marks',panelId:'base',x:18,y:24,w:260,h:34,r:0,template:'Please note the product has {{packageCount}} packages,\nand this is the package {{packageIndex}}',fontSize:6},
  {id:'thisSideUp',type:'icon',icon:'up',group:'marks',panelId:'lid',x:242,y:18,w:34,h:34,r:0},
];

export const defaultElements=rscElements;
export function elementsForTemplate(template='side-seal-rsc'){return structuredClone(template==='mailer-150010'?mailerElements:rscElements);}
export function stateForTemplate(template,previousVariables=defaultVariables){return {structure:defaultsForTemplate(template),elements:elementsForTemplate(template),variables:structuredClone(previousVariables),selectedId:'sku'};}

export const defaultState = {
  projectName:'美线侧封箱 / Demo Project',projectId:'',projectRemoteRevision:0,remoteProjectEndpoint:'',lastRemoteSyncAt:null,
  structure:structuredClone(defaultStructure),variables:structuredClone(defaultVariables),elements:structuredClone(defaultElements),hiddenGroups:{},lockedGroups:{dieline:true},lockedVariables:['originCountry','destinationCountry','dimensionUnit','weightUnit'],
  customerProfileId:'us-export-master',packagingRuleProfileId:'us-side-seal',markTemplateId:'us-side-seal-master',masterTemplates:[],customCustomerProfiles:{},customPackagingRules:{},customMarkTemplates:{},customMarkAssets:{},
  selectedId:'sku',zoom:100,grid:true,guides:true,page:'editor',editorTab:'Design',savedAt:null,showRulers:true,syncDimensions:true,foldProgress:100,
  markEditorPanelId:'front',productionActor:'local-user',productionRole:'operator',productionJobs:[],activeProductionJobId:null,
  batch:{fileName:'',rows:[],selectedIndex:0,columns:[],sheets:[],sheetIndex:0,mapping:{},masterTemplateId:'',queue:null},
  dielineEdit:{kind:'CUT',index:0},curveEdit:{kind:'CUT',index:0},panelEdit:{selected:[],splitOrientation:'vertical',splitRatio:0.5,polygonPoints:'20,20 110,20 130,65 80,100 20,80'},
  exportOptions:{outlineText:false,fontMode:'technical',printProfile:'generic',spotDielines:true,overprintDielines:true,spotNames:{CUT:'CutContour',CREASE:'Crease',PERF:'Perforation',GLUE:'Glue'},pdfxMode:'off',outputConditionIdentifier:'Custom CMYK',outputConditionInfo:'User supplied CMYK ICC output profile'},repairTolerance:0.5,
};

export function cloneState(state){return JSON.parse(JSON.stringify(state));}
