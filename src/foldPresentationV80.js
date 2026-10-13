// Keep all hinges connected; rotate the assembly onto its printed side up.
export function foldPresentationPointV80(point,geo,progress){const t=Math.max(0,Math.min(1,Number(progress)/100)),ease=t*t*t*(t*(t*6-15)+10),angle=(1-ease)*(geo.foldRoot==='base'?Math.PI:-Math.PI/2),c=Math.cos(angle),s=Math.sin(angle);return[point[0],c*point[1]-s*point[2],s*point[1]+c*point[2]];}
