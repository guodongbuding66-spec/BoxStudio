import {createMarkDocumentV67,setMarkArtboardV67,validateMarkDocumentV67} from './standaloneMarksV67.js';
import {syncMarkFacesV74,createSideMarkFaceV74} from './markFacesV74.js';
import {textStyleV76} from './textLayoutV76.js';
export const CUSTOMER_MARK_TEMPLATES_V79=Object.freeze([
 {id:'retail',name:'零售客户 · SKU / 合同 / 箱号',heading:'RETAIL SHIPMENT',customer:'CUSTOMER / RETAIL'},
 {id:'apparel',name:'服饰客户 · 款号 / 颜色 / 尺码',heading:'APPAREL COLLECTION',customer:'CUSTOMER / APPAREL'},
 {id:'food',name:'食品客户 · 批次 / 保存信息',heading:'FOOD SHIPMENT',customer:'CUSTOMER / FOOD'},
 {id:'beauty',name:'日化客户 · 产品 / 批次',heading:'PERSONAL CARE',customer:'CUSTOMER / BEAUTY'},
 {id:'parts',name:'工业客户 · 部件 / 包装数量',heading:'PARTS & COMPONENTS',customer:'CUSTOMER / PARTS'},
 {id:'gift',name:'礼品客户 · 系列 / 箱号',heading:'GIFT COLLECTION',customer:'CUSTOMER / GIFTS'},
 {id:'warehouse',name:'仓储配送 · 库位 / 目的地',heading:'WAREHOUSE DELIVERY',customer:'CUSTOMER / LOGISTICS'},
 {id:'export',name:'外贸客户 · 订单 / 目的港',heading:'EXPORT CARTON',customer:'CUSTOMER / EXPORT'}
]);
export function createCustomerMarkV79(id){const t=CUSTOMER_MARK_TEMPLATES_V79.find(t=>t.id===id);if(!t)throw new Error('客户唛头模板不存在。');let s=setMarkArtboardV67(createMarkDocumentV67('shipping'),340,270);s.projectName=t.name;s.variables={...s.variables,customer:t.customer,orderNo:'ORDER-001',batch:'LOT-001',color:'NATURAL',size:'M',quantity:'24',storage:'KEEP DRY',warehouse:'A-01',port:'DESTINATION PORT',series:'COLLECTION-01'};
 const txt=(id,template,x,y,w,h,fontSize=5,bold=false)=>({id:'customer-'+id,type:'text',group:'marks',panelId:'label',template,x,y,w,h,fontSize,bold,r:0,fontIdV74:'noto-sc-full',fontWeightV79:bold?700:400,textStyleV76:textStyleV76({color:'#111111'})});
 s.elements=[txt('heading',t.heading,12,12,316,15,7,true),txt('name','{{customer}}',12,31,316,16,6,true),txt('sku','SKU: {{sku}}',12,55,180,14,5,true),txt('carton','CARTON: {{packageIndex}} / {{packageCount}}',197,55,131,14,4),txt('order','ORDER: {{orderNo}}\nCONTRACT: {{contractNo}}',12,76,190,28,4),txt('weight','N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',207,76,121,28,4),txt('meas','MEAS: {{length}} x {{width}} x {{height}} {{dimensionUnit}}',12,110,316,12,4),{...s.elements.find(e=>e.type==='barcode-qr-group'),x:12,y:133},...['up','fragile','dry'].map((icon,i)=>({id:'customer-'+icon,type:'icon',icon,group:'marks',panelId:'label',x:282,y:133+i*26,w:24,h:24,r:0})),txt('origin','Made in {{originCountry}} · {{destinationCountry}}',12,244,316,14,4)];
 const side=createSideMarkFaceV74();side.artboard={width:220,height:260};for(const e of side.elements){if(e.type==='text'){e.fontIdV74='noto-sc-full';e.fontWeightV79=e.bold?700:400;e.textStyleV76=textStyleV76();}if(e.type==='icon')e.y+=35;}
 const info={apparel:'COLOR: {{color}} / SIZE: {{size}}',food:'LOT: {{batch}} / {{storage}}',beauty:'LOT: {{batch}}',parts:'QTY: {{quantity}} PCS',gift:'SERIES: {{series}}',warehouse:'LOCATION: {{warehouse}}',export:'PORT: {{port}}',retail:'ORDER: {{orderNo}}'}[id];side.elements.push(txt('side-detail',info,12,174,196,16,3.5));s.activeMarkFaceV74='front';s.markFacesV74={front:{artboard:s.artboard,elements:s.elements,selectedId:s.elements[0].id},side};s.selectedId=s.elements[0].id;s=syncMarkFacesV74(s);validateMarkDocumentV67(s);return s;}
