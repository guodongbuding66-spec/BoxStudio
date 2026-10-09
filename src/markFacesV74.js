// Both faces keep independent layouts and physical sizes, with one shared data set.
const clone=x=>structuredClone(x);
export const MARK_FACES_V74=[{id:'front',label:'正唛'},{id:'side',label:'侧唛'}];
const snapshot=s=>({artboard:clone(s.artboard),elements:clone(s.elements),selectedId:s.selectedId||''});
export function createSideMarkFaceV74(){
 const text=(id,template,y,h=18,size=5,bold=false)=>({id:'side-'+id,type:'text',group:'marks',panelId:'label',x:12,y,w:196,h,fontSize:size,bold,r:0,template});
 return {artboard:{width:220,height:220},selectedId:'side-sku',elements:[
  text('sku','SKU: {{sku}}',14,24,7,true),text('carton','CARTON: {{packageIndex}} / {{packageCount}}',46),
  text('weight','N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',76,30),
  text('meas','MEAS: {{length}} x {{width}} x {{height}} {{dimensionUnit}}',116,18,4),
  text('origin','Made in {{originCountry}}',146),
  ...['up','fragile','dry'].map((icon,i)=>({id:'side-'+icon,type:'icon',icon,group:'marks',panelId:'label',x:12+i*36,y:178,w:24,h:24,r:0}))
 ]};
}
export function syncMarkFacesV74(state){
 const s=clone(state),active=s.activeMarkFaceV74||'front';
 if(!MARK_FACES_V74.some(f=>f.id===active))throw new Error('唛头面无效。');
 s.activeMarkFaceV74=active;
 s.markFacesV74=s.markFacesV74?clone(s.markFacesV74):{front:snapshot(s),side:createSideMarkFaceV74()};
 s.markFacesV74[active]=snapshot(s);return s;
}
export function markFaceStateV74(state,face){
 if(!MARK_FACES_V74.some(f=>f.id===face))throw new Error('唛头面无效。');
 const s=syncMarkFacesV74(state),board=s.markFacesV74[face];
 if(!board||!Array.isArray(board.elements)||!board.artboard)throw new Error('唛头面数据不完整。');
 return {...s,...clone(board),activeMarkFaceV74:face};
}
export function switchMarkFaceV74(state,face,setArtboard){
 const s=markFaceStateV74(state,face);return setArtboard(s,s.artboard.width,s.artboard.height);
}
export function validateMarkFacesV74(state,validate){
 if(!state.markFacesV74)return true;
 if(!MARK_FACES_V74.some(f=>f.id===state.activeMarkFaceV74))throw new Error('唛头面无效。');
 if(Object.keys(state.markFacesV74).length!==2)throw new Error('项目必须包含正唛与侧唛。');
 for(const {id} of MARK_FACES_V74){const face=state.markFacesV74[id];if(!face)throw new Error('项目缺少'+id+'唛头。');const s={...state,...face};delete s.markFacesV74;delete s.activeMarkFaceV74;validate(s);}
 return true;
}
