// Liners, fluted paper and empty channels are geometry, with phase in mm.
export function corrugatedEdgeV80(panel,thickness,settings={}){
 const out={name:'edge',positions:[],normals:[],uv:[]},n=panel.normal,pitch=settings.flutePitch||3.2,layers=settings.fluteLayers||1;
 const emit=(points,uvs)=>{const a=points[0],b=points[1].map((v,k)=>v-a[k]),c=points[2].map((v,k)=>v-a[k]),normal=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]],length=Math.hypot(...normal)||1;for(let i=0;i<3;i++){out.positions.push(...points[i]);out.normals.push(...normal.map(v=>v/length));out.uv.push(...uvs[i]);}};
 const area=panel.uvMap.uv.reduce((s,a,i)=>{const b=panel.uvMap.uv[(i+1)%panel.points.length];return s+a[0]*b[1]-b[0]*a[1]},0),order=area>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
 for(let i=0;i<panel.points.length;i++){const j=(i+1)%panel.points.length,a=panel.points[i],b=panel.points[j],ua=panel.uvMap.uv[i],ub=panel.uvMap.uv[j],length=Math.hypot(...b.map((v,k)=>v-a[k])),segments=Math.min(512,Math.max(1,Math.ceil(length/(pitch/12))));
 for(let k=0;k<segments;k++){const ts=[k/segments,(k+1)/segments],base=ts.map(t=>a.map((v,q)=>v+(b[q]-v)*t)),x=ts.map(t=>(ua[0]+(ub[0]-ua[0])*t)*panel.panel.w),bands=[[-.5*thickness,-.4*thickness],[.4*thickness,.5*thickness]];
 for(let layer=0;layer<layers-1;layer++){const y=-thickness*.4+(layer+1)*thickness*.8/layers;bands.push([y-thickness*.025,y+thickness*.025]);}
 const quads=bands.map(([lo,hi])=>[[lo,lo],[hi,hi]]);for(let layer=0;layer<layers;layer++){const center=-thickness*.4+(layer+.5)*thickness*.8/layers,amplitude=thickness*.32/layers,ys=x.map(v=>center+Math.sin(v/pitch*Math.PI*2)*amplitude),paper=thickness*.025/layers;quads.push([ys.map(v=>v-paper),ys.map(v=>v+paper)]);}
 for(const[lo,hi]of quads){const data=[[0,hi[0]],[1,hi[1]],[1,lo[1]],[0,lo[0]]],points=data.map(([t,y])=>base[t].map((v,q)=>v+n[q]*y)),uvs=data.map(([t,y])=>[x[t],.5+y/thickness]);for(let v=0;v<6;v+=3)emit(order.slice(v,v+3).map(q=>points[q]),order.slice(v,v+3).map(q=>uvs[q]));}}
 }return out;
}
