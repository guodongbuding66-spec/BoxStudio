import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { buildPanelArtworkPlan } from '../src/panelArtwork.js';
import {
  getMarkComponentCatalogV34, insertMarkComponentV34, patchMarkElementV34, variableUsageMapV34,
  missingVariablesV34, setVariableV34, insertVariableTokenV34, saveMarkRuleV34, markRuleDebugV34,
  applyMarkRulesV34, createMarkBlockFromSelectionV34, saveCustomMarkBlockV34, insertMarkBlockV34,
  applyCustomerMarkPresetV34, saveCurrentMarksTemplateV34, catalogsV34
} from '../src/marksWorkspaceV34.js';

let state=structuredClone(defaultState);
const catalog=getMarkComponentCatalogV34(state);
for(const id of ['sku','weight','dimensions','origin','destination','package','barcode-qr','this-side-up','fragile','keep-dry'])assert.ok(catalog[id],`missing component ${id}`);
assert.ok(catalog['asset:asset-this-side-up'],'built-in assets should also surface as component-library entries');

// Component insertion creates ordinary production-safe primitives on a real panel.
const before=state.elements.length;
state=insertMarkComponentV34(state,'sku',{panelId:'front',x:22,y:24,idFactory:()=> 'v34-sku'});
assert.equal(state.elements.length,before+1);
let inserted=state.elements.find(x=>x.id==='v34-sku');
assert.equal(inserted.group,'marks');assert.equal(inserted.panelId,'front');assert.equal(inserted.type,'text');
let plan=buildPanelArtworkPlan(state,generateGeometry(state.structure),'front');
assert.ok(plan.commands.some(command=>command.source==='v34-sku'&&command.type==='text'));

// Inspector patching stays on the same production primitive instead of creating UI-only data.
state=patchMarkElementV34(state,'v34-sku',{x:31.5,y:42.5,fontSize:9.5,bold:true,template:'ITEM {{sku}} / {{contractNo}}'});
inserted=state.elements.find(x=>x.id==='v34-sku');assert.equal(inserted.x,31.5);assert.equal(inserted.fontSize,9.5);assert.equal(inserted.bold,true);

// Variable token insertion + usage map + missing visualization.
assert.equal(insertVariableTokenV34('SKU: ','sku'),'SKU: {{sku}}');
let usage=variableUsageMapV34(state),skuUsage=usage.find(item=>item.key==='sku');assert.ok(skuUsage.uses.some(use=>use.elementId==='v34-sku'));
state.variables.contractNo='';
assert.ok(missingVariablesV34(state).some(item=>item.key==='contractNo'));
assert.throws(()=>setVariableV34(state,'originCountry','US'),/locked/);
state=setVariableV34(state,'sku','V34-SKU-001');assert.equal(state.variables.sku,'V34-SKU-001');

// Component-level rule preview/debug supports package-count / country / customer style conditions.
state.variables.packageCount='1';
state=saveMarkRuleV34(state,{id:'show-sku-multi',label:'Show SKU only for multi-package',targetIds:['v34-sku'],effect:'show',conditions:[{field:'packageCount',op:'gt',value:'1'}]});
assert.equal(state.elements.find(x=>x.id==='v34-sku').hidden,true);
let debug=markRuleDebugV34(state).find(item=>item.rule.id==='show-sku-multi');assert.equal(debug.matched,false);assert.equal(debug.trace[0].actual,'1');
state=setVariableV34(state,'packageCount','3');state=applyMarkRulesV34(state);assert.equal(state.elements.find(x=>x.id==='v34-sku').hidden,false);
debug=markRuleDebugV34(state).find(item=>item.rule.id==='show-sku-multi');assert.equal(debug.matched,true);
state=saveMarkRuleV34(state,{id:'hide-non-us',label:'Hide for non-US',targetIds:['v34-sku'],effect:'hide',conditions:[{field:'destinationCountry',op:'neq',value:'US'}]});
assert.equal(markRuleDebugV34(state).find(item=>item.rule.id==='hide-non-us').matched,false);
state=saveMarkRuleV34(state,{id:'customer-rule',label:'Customer condition',targetIds:['v34-sku'],effect:'show',conditions:[{field:'customerProfileId',op:'eq',value:'us-export-master'}]});
assert.equal(markRuleDebugV34(state).find(item=>item.rule.id==='customer-rule').matched,true);

// Reusable blocks remain flat mark primitives and can be saved/inserted without a nested serializer-only scene graph.
const block=createMarkBlockFromSelectionV34(state,['v34-sku'],{id:'saved-sku-block',label:'Saved SKU Block'});assert.equal(block.elements.length,1);assert.equal(block.elements[0].id,undefined);assert.equal(block.elements[0].dx,0);assert.equal(block.elements[0].dy,0);
state=saveCustomMarkBlockV34(state,block);const beforeBlock=state.elements.length;state=insertMarkBlockV34(state,'saved-sku-block',{panelId:'back',x:12,y:14,idFactory:(_,i)=>`saved-block-${i}`});assert.equal(state.elements.length,beforeBlock+1);assert.equal(state.elements.find(x=>x.id==='saved-block-0').panelId,'back');
const builtInBefore=state.elements.length;state=insertMarkBlockV34(state,'handling-icons',{panelId:'left',x:10,y:10,idFactory:(_,i)=>`handling-${i}`});assert.equal(state.elements.length,builtInBefore+3);assert.ok(state.elements.filter(x=>x.id.startsWith('handling-')).every(x=>x.group==='marks'));

// Existing customer + mark-template domains are unified through the V0.34 preset path.
let preset=structuredClone(defaultState);preset.variables.originCountry='';preset.variables.destinationCountry='';preset=applyCustomerMarkPresetV34(preset,'us-export-master',{overwriteDefaults:true});assert.equal(preset.customerProfileId,'us-export-master');assert.equal(preset.packagingRuleProfileId,'us-side-seal');assert.equal(preset.markTemplateId,'us-side-seal-master');assert.equal(preset.variables.originCountry,'China');assert.equal(preset.variables.destinationCountry,'US');

// Current mark layouts can be captured as reusable customer/project templates.
let templated=saveCurrentMarksTemplateV34(state,{id:'v34-custom-template',label:'V34 Custom Template'});assert.ok(templated.customMarkTemplates['v34-custom-template']);assert.ok(templated.customMarkTemplates['v34-custom-template'].elements.length>0);
const allCatalogs=catalogsV34(templated);assert.ok(allCatalogs.blocks['saved-sku-block']);assert.ok(allCatalogs.templates['v34-custom-template']);assert.ok(allCatalogs.customers['us-export-master']);

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('BoxStudio V0.34'));assert.ok(index.includes('v34Ui.css'));assert.ok(index.includes('v34Ui.js'));
const ui=await readFile(new URL('../src/v34Ui.js',import.meta.url),'utf8');assert.ok(ui.includes('Marks Studio'));assert.ok(ui.includes('Reusable Blocks'));assert.ok(ui.includes('Rules / Debug'));assert.ok(ui.includes('Drop components onto the panel'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.34.0');
console.log('BoxStudio V0.34 Marks Studio tests passed');
