import { resolveMaterialV32 } from './materialsV32.js';

const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,min,max=Infinity)=>Math.min(max,Math.max(min,v));
const round=(v,p=3)=>{const m=10**p;return Math.round(n(v)*m)/m};

export const V48_BEND_RULES=Object.freeze({
  corrugated:{factor:.70,min:.6,maxFactor:1.5,label:'Corrugated engineering score'},
  paperboard:{factor:.85,min:.25,maxFactor:2,label:'Paperboard crease'},
  'rigid-board':{factor:1.15,min:.8,maxFactor:2.5,label:'Rigid-board hinge allowance'},
});

export const V48_ADVANCED_RANGES=Object.freeze({
  flapRatio:{min:.18,max:.78,default:.5},
  tuckRatio:{min:.28,max:1.15,default:.78},
  dustRatio:{min:.22,max:.9,default:.62},
  wingRatio:{min:.25,max:1.35,default:.62},
  glueMm:{min:0,max:80},
});

export function bendProfileV48(structure={}){
  const material=resolveMaterialV32(structure),rule=V48_BEND_RULES[material.category]||V48_BEND_RULES.paperboard,t=material.thicknessMm;
  const recommended=clamp(t*rule.factor,rule.min,t*rule.maxFactor);
  const mode=structure.bendRadiusMode==='manual'?'manual':'auto';
  const requested=n(structure.bendRadiusMm,recommended),radius=mode==='manual'?clamp(requested,.05,Math.max(.05,t*4)):recommended;
  const scoreAllowance=clamp(n(structure.scoreAllowanceMm,t*.35),0,t*2);
  return Object.freeze({mode,radiusMm:round(radius),recommendedRadiusMm:round(recommended),scoreAllowanceMm:round(scoreAllowance),thicknessMm:round(t),materialId:material.materialId,category:material.category,flute:material.flute,rule:rule.label});
}

export function advancedStructureParamsV48(structure={}){
  const W=Math.max(1,n(structure.width,200)),H=Math.max(1,n(structure.height,60));
  const flapRatio=clamp(n(structure.flapRatio,structure.flap?structure.flap/Math.max(W,1):V48_ADVANCED_RANGES.flapRatio.default),V48_ADVANCED_RANGES.flapRatio.min,V48_ADVANCED_RANGES.flapRatio.max);
  const tuckRatio=clamp(n(structure.tuckRatio,structure.tuckDepth?structure.tuckDepth/Math.max(W,1):V48_ADVANCED_RANGES.tuckRatio.default),V48_ADVANCED_RANGES.tuckRatio.min,V48_ADVANCED_RANGES.tuckRatio.max);
  const dustRatio=clamp(n(structure.dustFlapRatio,V48_ADVANCED_RANGES.dustRatio.default),V48_ADVANCED_RANGES.dustRatio.min,V48_ADVANCED_RANGES.dustRatio.max);
  const wingRatio=clamp(n(structure.wingRatio,structure.wing?structure.wing/Math.max(H,1):V48_ADVANCED_RANGES.wingRatio.default),V48_ADVANCED_RANGES.wingRatio.min,V48_ADVANCED_RANGES.wingRatio.max);
  return Object.freeze({
    flapRatio:round(flapRatio),flapDepthMm:round(W*flapRatio),
    tuckRatio:round(tuckRatio),tuckDepthMm:round(W*tuckRatio),
    dustFlapRatio:round(dustRatio),dustFlapDepthMm:round(W*dustRatio),
    wingRatio:round(wingRatio),wingMm:round(Math.max(H,H*wingRatio)),
    glueMm:round(clamp(n(structure.glue,18),V48_ADVANCED_RANGES.glueMm.min,V48_ADVANCED_RANGES.glueMm.max)),
  });
}

export function normalizeParametricStructureV48(structure={},patch={}){
  const next={...structuredClone(structure),...structuredClone(patch)};
  if(patch.materialId||patch.flute||patch.thickness!=null){const m=resolveMaterialV32(next);next.materialId=m.materialId;next.flute=m.flute||'CUSTOM';next.thickness=round(m.thicknessMm)}
  const advanced=advancedStructureParamsV48(next);
  next.flapRatio=advanced.flapRatio;next.flap=advanced.flapDepthMm;
  next.tuckRatio=advanced.tuckRatio;next.tuckDepth=advanced.tuckDepthMm;
  next.dustFlapRatio=advanced.dustFlapRatio;next.dustFlapDepth=advanced.dustFlapDepthMm;
  next.wingRatio=advanced.wingRatio;next.wing=advanced.wingMm;
  next.glue=advanced.glueMm;
  const bend=bendProfileV48(next);next.bendRadiusMode=bend.mode;next.bendRadiusMm=bend.radiusMm;next.scoreAllowanceMm=bend.scoreAllowanceMm;
  return next;
}

export function validateParametricStructureV48(structure={}){
  const issues=[],bend=bendProfileV48(structure),advanced=advancedStructureParamsV48(structure),L=n(structure.length),W=n(structure.width),H=n(structure.height);
  if(L<=0||W<=0||H<=0)issues.push({severity:'error',code:'V48_DIMENSION_INVALID',detail:'L/W/H must all be greater than 0 mm.'});
  if(bend.radiusMm<=0)issues.push({severity:'error',code:'V48_BEND_RADIUS_INVALID',detail:'Bend radius must be greater than 0 mm.'});
  if(bend.mode==='manual'&&bend.radiusMm>bend.thicknessMm*4+1e-6)issues.push({severity:'error',code:'V48_BEND_RADIUS_TOO_LARGE',detail:'Manual bend radius is outside the supported engineering range for this board thickness.'});
  if(advanced.flapDepthMm>=Math.max(W,H)*1.25)issues.push({severity:'warning',code:'V48_FLAP_DEPTH_REVIEW',detail:'Flap depth is unusually large relative to the box section.'});
  if(advanced.tuckDepthMm<Math.min(8,W*.2))issues.push({severity:'warning',code:'V48_TUCK_DEPTH_REVIEW',detail:'Tuck depth may be too shallow for reliable closure.'});
  return{ok:!issues.some(x=>x.severity==='error'),issues,bend,advanced};
}

export function manufacturingControlsV48(structure={}){const bend=bendProfileV48(structure),advanced=advancedStructureParamsV48(structure);return{schema:'boxstudio-manufacturing-controls-v48',version:1,bend,advanced}}
export const V48_PARAMETRIC_CONTROLS_VERSION='V0.48';
