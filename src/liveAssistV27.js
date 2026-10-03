import { userGuideSnapV26, textBaselineSnapV26, smartRotationV26 } from './smartGuidesV26.js';

const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};

export function liveTranslationAssistV27(state,ids,dx,dy,geo,{enabled=true,userGuides=true,userToleranceMm=3,textBaselines=true,baselineToleranceMm=3}={}){
  let out={dx:num(dx),dy:num(dy),guides:[]};
  if(!enabled)return out;
  const user=userGuideSnapV26(state,ids,out.dx,out.dy,{enabled:userGuides,toleranceMm:userToleranceMm});
  out={dx:user.dx,dy:user.dy,guides:[...user.guides]};
  const userHasY=user.guides.some(g=>g.kind==='user-guide'&&g.axis==='y');
  if(textBaselines&&!userHasY){const baseline=textBaselineSnapV26(state,ids,out.dx,out.dy,geo,{enabled:true,toleranceMm:baselineToleranceMm});out={dx:baseline.dx,dy:baseline.dy,guides:[...out.guides,...baseline.guides]};}
  return out;
}

export function liveRotationAssistV27(state,id,rawAngle,{enabled=true,toleranceDeg=3,step=15}={}){
  if(!enabled)return{angle:num(rawAngle),guides:[]};
  return smartRotationV26(state,id,num(rawAngle),{enabled:true,toleranceDeg,step,includeOrthogonal:true});
}

export function liveAssistDiagnosticsV27(state){return{userGuides:Array.isArray(state?.userGuides)?state.userGuides.length:0,textBaselineEnabled:state?.crossPanelEdit?.textBaselineGuides!==false,rotationEnabled:state?.crossPanelEdit?.rotationGuides!==false,userGuideToleranceMm:num(state?.crossPanelEdit?.userGuideToleranceMm,3),baselineToleranceMm:num(state?.crossPanelEdit?.textBaselineToleranceMm,3),rotationToleranceDeg:num(state?.crossPanelEdit?.rotationGuideToleranceDeg,3)};}
