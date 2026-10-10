// Solid paper surfaces keep exterior ink separate from the unprinted interior.
export function boardSurfacesV77(panel,thicknessMm=0){
 const n=panel.normal,half=Math.max(0,Number(thicknessMm)||0)/2;
 const surfaces=['front','inner','edge'].map(name=>({name,positions:[],normals:[],uv:[]}));
 const emit=(surface,index,normal,shift)=>{surface.positions.push(...panel.points[index].map((v,k)=>v+n[k]*shift));surface.normals.push(...normal);surface.uv.push(...panel.uvMap.uv[index]);};
 for(const tri of panel.uvMap.triangles){for(const i of tri)emit(surfaces[0],i,n,half);for(const i of [...tri].reverse())emit(surfaces[1],i,n.map(v=>-v),-half);}
 if(half){const points=panel.points,area=[0,0,0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area[0]+=(a[1]-b[1])*(a[2]+b[2]);area[1]+=(a[2]-b[2])*(a[0]+b[0]);area[2]+=(a[0]-b[0])*(a[1]+b[1]);}
  const direction=area.reduce((s,v,i)=>s+v*n[i],0)>=0?1:-1;
  for(let i=0;i<points.length;i++){const j=(i+1)%points.length,e=points[j].map((v,k)=>v-points[i][k]),normal=[e[1]*n[2]-e[2]*n[1],e[2]*n[0]-e[0]*n[2],e[0]*n[1]-e[1]*n[0]],length=Math.hypot(...normal);if(length<1e-8)continue;const outward=normal.map(v=>v/length*direction),corners=[[i,half],[j,half],[j,-half],[i,-half]],order=direction>0?[0,2,1,0,3,2]:[0,1,2,0,2,3];for(const k of order)emit(surfaces[2],corners[k][0],outward,corners[k][1]);}
 }return surfaces.filter(s=>s.positions.length);
}
