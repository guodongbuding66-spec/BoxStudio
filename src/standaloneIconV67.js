// Normalized transport symbols shared by the editable SVG and production PDF.
const symbols={
 up:[['M',.32,.72],['L',.32,.27],['L',.22,.42],['M',.32,.27],['L',.42,.42],['M',.68,.72],['L',.68,.27],['L',.58,.42],['M',.68,.27],['L',.78,.42]],
 fragile:[['M',.28,.18],['L',.72,.18],['L',.61,.48],['L',.39,.48],['Z'],['M',.5,.48],['L',.5,.78],['M',.34,.78],['L',.66,.78]],
 dry:[['M',.18,.48],['C',.393333,.16,.606667,.16,.82,.48],['Z'],['M',.5,.48],['L',.5,.78],['C',.58,.86,.646667,.86,.7,.78]],
};
export function standaloneIconSvgV67(el){const ops=symbols[el.icon]||symbols.dry;const path=ops.map(([op,...values])=>op+values.map((v,i)=>Number((v*(i%2?el.h:el.w)).toFixed(5))).join(' ')).join(' ');return`<rect width="${el.w}" height="${el.h}" fill="none" stroke="#111" stroke-width=".5"/><path d="${path}" fill="none" stroke="#111" stroke-width=".6"/>`;}
export function standaloneIconPdfV67(el,x,y,pageH,pt){const f=n=>Number(n.toFixed(3));const lines=['0 0 0 1 K [] 0 d 0.6 w',`${f(x*pt)} ${f((pageH-y-el.h)*pt)} ${f(el.w*pt)} ${f(el.h*pt)} re S`];for(const [op,...values]of symbols[el.icon]||symbols.dry){if(op==='Z'){lines.push('h');continue;}lines.push(values.map((v,i)=>f((i%2?pageH-y-v*el.h:x+v*el.w)*pt)).join(' ')+({M:' m',L:' l',C:' c'}[op]));}lines.push('S');return lines;}
