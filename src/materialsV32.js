export const MATERIAL_SCHEMA_VERSION_V32 = 1;

// Engineering defaults for interactive design. Factory/customer profiles may override every value.
export const FLUTE_PRESETS_V32 = Object.freeze({
  F:{id:'F',label:'F flute',thicknessMm:0.8,ply:3,category:'corrugated'},
  E:{id:'E',label:'E flute',thicknessMm:1.5,ply:3,category:'corrugated'},
  B:{id:'B',label:'B flute',thicknessMm:3.0,ply:3,category:'corrugated'},
  C:{id:'C',label:'C flute',thicknessMm:4.0,ply:3,category:'corrugated'},
  EB:{id:'EB',label:'EB double wall',thicknessMm:4.5,ply:5,category:'corrugated'},
  BC:{id:'BC',label:'BC double wall',thicknessMm:7.0,ply:5,category:'corrugated'},
  AA:{id:'AA',label:'AA double wall',thicknessMm:9.0,ply:5,category:'corrugated'},
});

export const MATERIAL_PRESETS_V32 = Object.freeze([
  {id:'corrugated-white',name:'White Corrugated',category:'corrugated',defaultFlute:'E',defaultThicknessMm:1.5,appearance:'white-fiber'},
  {id:'corrugated-kraft',name:'Brown Kraft Corrugated',category:'corrugated',defaultFlute:'B',defaultThicknessMm:3.0,appearance:'kraft'},
  {id:'sbs-paperboard',name:'SBS Paperboard',category:'paperboard',defaultFlute:null,defaultThicknessMm:0.45,appearance:'coated-white'},
  {id:'kraft-paperboard',name:'Kraft Paperboard',category:'paperboard',defaultFlute:null,defaultThicknessMm:0.50,appearance:'kraft'},
  {id:'greyboard',name:'Greyboard',category:'rigid-board',defaultFlute:null,defaultThicknessMm:1.00,appearance:'grey-fiber'},
]);

export function materialByIdV32(id){return MATERIAL_PRESETS_V32.find(x=>x.id===id)||null;}
export function fluteByIdV32(id){return FLUTE_PRESETS_V32[String(id||'').toUpperCase()]||null;}

export function resolveMaterialV32(input={}){
  const material=materialByIdV32(input.materialId)||MATERIAL_PRESETS_V32[0];
  const flute=material.category==='corrugated'?(fluteByIdV32(input.flute)||fluteByIdV32(material.defaultFlute)):null;
  const explicit=Number(input.thickness);
  const thicknessMm=Number.isFinite(explicit)&&explicit>0?explicit:(flute?.thicknessMm||material.defaultThicknessMm);
  return Object.freeze({
    materialId:material.id,
    name:material.name,
    category:material.category,
    flute:flute?.id||null,
    ply:flute?.ply||1,
    thicknessMm,
    appearance:material.appearance,
    source:Number.isFinite(explicit)&&explicit>0?'explicit':'engineering-preset',
  });
}

export function validateMaterialV32(input={}){
  const resolved=resolveMaterialV32(input),issues=[];
  if(resolved.thicknessMm<=0)issues.push({code:'THICKNESS_INVALID',severity:'error',detail:'Board thickness must be greater than 0 mm.'});
  if(resolved.category==='corrugated'&&!resolved.flute)issues.push({code:'FLUTE_REQUIRED',severity:'error',detail:'Corrugated board requires a flute preset or factory override.'});
  return {ok:!issues.some(x=>x.severity==='error'),resolved,issues};
}
