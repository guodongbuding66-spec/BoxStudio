// Rich styles refer to original template UTF-16 ranges. A variable is an atomic
// source token; its complete replacement inherits the style at the opening brace.
export function resolveTextElementV79(el,variables={}){
 if(!el.textRunsV77?.length||!String(el.template).includes('{{'))return el;
 const source=String(el.template),ranges=[];let output='',cursor=0;
 const add=(from,to,value,atomic=false)=>{const start=output.length;output+=value;if(atomic){const r=el.textRunsV77.find(r=>from>=r.start&&from<r.end);if(r&&value.length)ranges.push({...r,start,end:output.length});}else for(const r of el.textRunsV77){const a=Math.max(from,r.start),b=Math.min(to,r.end);if(b>a)ranges.push({...r,start:start+a-from,end:start+b-from});}};
 for(const match of source.matchAll(/{{\s*([\w]+)\s*}}/g)){add(cursor,match.index,source.slice(cursor,match.index));add(match.index,match.index+match[0].length,String(variables[match[1]]??''),true);cursor=match.index+match[0].length;}
 add(cursor,source.length,source.slice(cursor));return{...el,template:output,textRunsV77:ranges.sort((a,b)=>a.start-b.start)};
}
