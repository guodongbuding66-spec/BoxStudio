// Original carton pictograms, dedicated under CC0-1.0. Shared normalized geometry.
// General-purpose packaging instructions, not certified ISO reproductions.
const path=(ops,fill=false,stroke=4)=>({ops:ops.map(([op,...v])=>[op,...v.map(n=>n/100)]),fill,stroke:stroke/100,rule:'nonzero',cap:'round',join:'round'});
const line=(...pts)=>path(pts.map(([x,y],i)=>[i?'L':'M',x,y]));
const poly=(pts,fill=true,stroke=0)=>path([...pts.map(([x,y],i)=>[i?'L':'M',x,y]),['Z']],fill,stroke);
const rect=(x,y,w,h,fill=false,stroke=4)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],fill,stroke);
const circle=(x,y,r,fill=true,stroke=0)=>{const k=r*.55228475;return path([['M',x+r,y],['C',x+r,y+k,x+k,y+r,x,y+r],['C',x-k,y+r,x-r,y+k,x-r,y],['C',x-r,y-k,x-k,y-r,x,y-r],['C',x+k,y-r,x+r,y-k,x+r,y],['Z']],fill,stroke);};
const mirror=p=>({...p,ops:p.ops.map(([op,...v])=>[op,...v.map((n,i)=>i%2?n:1-n)])});
const slash=()=>[circle(50,50,42,false,4),path([['M',20,20],['L',80,80]],false,6)];
const person=()=>[circle(17,20,7),path([['M',17,34],['L',13,57],['L',24,70],['L',22,88]],false,7),path([['M',13,57],['L',7,86],['M',18,38],['L',26,53],['L',34,53]],false,7)];
const forklift=()=>[circle(19,78,7),circle(48,78,7),poly([[9,57],[32,57],[32,48],[43,48],[53,60],[53,72],[9,72]]),path([['M',13,55],['L',13,30],['L',43,30],['L',51,56]],false,4),circle(30,41,5),path([['M',61,20],['L',61,79],['L',91,79]],false,5),rect(68,47,22,24,false,3)];
const handTruck=()=>[path([['M',13,15],['L',25,15],['L',65,77],['L',87,77]],false,5),circle(61,82,8),poly([[24,34],[49,22],[72,59],[46,72]],false,4),line([37,29],[59,66])];
const snowflake=()=>{const ops=[];for(let i=0;i<6;i++){const a=i*Math.PI/3,p=r=>[50+r*Math.cos(a),50+r*Math.sin(a)],base=p(23);ops.push(['M',50,50],['L',...p(35)],['M',base[0]+12*Math.cos(a+2.35),base[1]+12*Math.sin(a+2.35)],['L',...base],['L',base[0]+12*Math.cos(a-2.35),base[1]+12*Math.sin(a-2.35)]);}return[path(ops,false,4)];};
const palm=()=>path([['M',7,50],['C',10,46,14,46,18,50],['L',29,61],['L',42,65],['C',47,67,46,74,40,74],['L',23,69],['M',8,55],['L',13,75],['L',35,88],['L',46,88]],false,5);
const knife=()=>[poly([[20,79],[32,84],[53,56],[40,47]]),poly([[41,45],[72,15],[81,22],[55,58]],false,4)];
const falling=()=>[poly([[38,29],[67,40],[57,67],[28,56]],false,4),line([29,18],[23,10]),line([20,31],[10,26]),line([13,84],[85,84])];
const seated=()=>[circle(32,20,7),path([['M',32,34],['L',33,53],['L',59,53],['L',60,79]],false,8),path([['M',34,36],['L',51,44],['L',64,44]],false,5),rect(39,64,39,23,false,3)];
const boot=()=>[poly([[32,17],[55,17],[55,47],[73,54],[80,67],[25,67],[25,53],[32,49]]),rect(25,74,53,15,false,3)];
const book=()=>[path([['M',50,28],['C',39,20,23,19,10,23],['L',10,76],['C',24,72,39,74,50,82],['C',61,74,76,72,90,76],['L',90,23],['C',76,19,61,20,50,28],['L',50,82]],false,4),line([19,36],[37,38]),line([19,47],[37,49]),line([62,38],[80,36]),line([62,49],[80,47])];
const flame=()=>path([['M',50,13],['C',57,35,39,35,50,53],['C',53,42,64,39,64,28],['C',86,56,78,83,51,86],['C',24,85,17,61,31,44],['C',30,58,38,62,40,54],['C',30,37,45,29,50,13],['Z']],true,0);
const cup=()=>path([['M',61,15],['L',83,15],['L',80,34],['C',79,42,74,46,72,47],['L',72,79],['M',60,85],['L',84,85],['M',23,15],['L',23,38],['C',23,46,40,46,40,38],['L',40,15],['M',31.5,15],['L',31.5,85]],false,4);
const glove=()=>path([['M',32,87],['L',23,67],['L',10,48],['C',6,40,14,35,19,41],['L',29,51],['L',26,20],['C',25,12,34,11,35,19],['L',39,43],['L',39,13],['C',39,6,48,6,48,13],['L',49,42],['L',53,16],['C',54,9,63,11,62,18],['L',59,45],['L',67,24],['C',70,18,78,21,75,28],['L',69,57],['L',63,87],['Z']],false,4);
const radiation=()=>{const shapes=[circle(50,35,5)];for(let i=0;i<3;i++){const a=(i*120-90)*Math.PI/180,b=a+Math.PI/3,pts=[[50+11*Math.cos(a),35+11*Math.sin(a)],[50+27*Math.cos(a),35+27*Math.sin(a)]];for(let j=1;j<=8;j++)pts.push([50+27*Math.cos(a+(b-a)*j/8),35+27*Math.sin(a+(b-a)*j/8)]);pts.push([50+11*Math.cos(b),35+11*Math.sin(b)]);for(let j=7;j>=0;j--)pts.push([50+11*Math.cos(a+(b-a)*j/8),35+11*Math.sin(a+(b-a)*j/8)]);shapes.push(poly(pts));}return[...shapes,line([14,68],[86,68]),rect(30,77,40,14,false,3)];};
export const EXTRA_HANDLING_SYMBOLS_V82=Object.freeze([
 ['teamLift','双人抬箱 / 两人搬运','搬运',['两个人抬箱子','两人抬箱','双人搬运','多人搬运','two person lift','two-man lift','team lift'],true],
 ['heavy','重物警示','警示',['重箱','重物','heavy load','heavy package','weight warning']],
 ['handleCare','双手托举 / 小心搬运','搬运',['手托箱子','轻拿轻放','小心轻放','handle with care','hands package']],
 ['noForklift','禁止叉车','搬运',['禁止进叉','不能叉车','use no forks','no forklift','forklift prohibited']],
 ['forkliftHere','叉车搬运','搬运',['叉车标识','叉车装卸','进叉','forklift handling','fork lift']],
 ['handTruck','手推车搬运','搬运',['推车','手拉车','hand truck','trolley','dolly']],
 ['noDrop','禁止抛掷 / 跌落','搬运',['禁止扔','不要扔箱子','防跌落','do not drop','no throwing']],
 ['noStep','禁止踩踏','搬运',['不要踩','勿踏','no stepping','do not step']],
 ['noSit','禁止坐压','搬运',['不要坐','不可坐','do not sit','no sitting']],
 ['noBlade','禁止刀具开箱','开箱',['禁用刀片','禁止美工刀','禁止割刀','no cutter','no knife','do not use blade']],
 ['openHere','由此开启','开箱',['开箱位置','从这里打开','open here','opening']],
 ['liftHere','由此提起','搬运',['提手','把手','提起位置','lift here','lifting handles']],
 ['protectRadiation','避免辐射','保护',['防辐射','怕辐射','protect from radiation','radioactive sources']],
 ['keepFrozen','冷冻储存','保护',['冷冻','低温','keep frozen','cold storage']],
 ['noFreeze','不可冷冻','保护',['防冻','禁止冻结','do not freeze','no freezing']],
 ['esd','静电敏感','警示',['防静电','ESD','electrostatic sensitive','static sensitive']],
 ['keepAwayHeat','远离热源','保护',['怕热','防热','火焰','keep away from heat','protect heat']],
 ['foodContact','食品接触材料','使用',['食品级','杯叉','food contact','glass fork']],
 ['tidyman','请投入垃圾桶','回收',['垃圾入桶','环保','不要乱扔垃圾','tidyman','dispose litter']],
 ['readInstructions','阅读说明书','使用',['看说明','使用说明','read instructions','read manual']],
 ['wearGloves','佩戴防护手套','使用',['戴手套','手部防护','protective gloves','wear gloves']]
].map(([id,label,category,keywords,featured=false])=>Object.freeze({id,label,category,keywords:Object.freeze(keywords),featured,addedIn:'0.82'})));
const human=person(),weight=poly([[29,30],[71,30],[87,86],[13,86]]);
export const HANDLING_ART_V82=Object.freeze({
 teamLift:[...human,...human.map(mirror),rect(34,40,32,27,false,3)],
 heavy:[path([['M',38,28],['C',38,12,62,12,62,28]],false,5),{...weight,rule:'evenodd',ops:[...weight.ops,...rect(47,42,6,23).ops,...circle(50,75,3).ops]}],
 handleCare:[rect(31,18,38,32,false,4),palm(),mirror(palm())],
 noForklift:[...forklift(),...slash()],forkliftHere:forklift(),handTruck:handTruck(),
 noDrop:[...falling(),...slash()],noStep:[...boot(),...slash()],noSit:[...seated(),...slash()],noBlade:[...knife(),...slash()],
 openHere:[rect(25,48,50,35,false,4),poly([[25,48],[10,32],[35,21],[50,36]],false,3),poly([[75,48],[90,32],[65,21],[50,36]],false,3),line([50,37],[50,81])],
 liftHere:[rect(31,39,38,30,false,4),poly([[50,5],[40,18],[46,18],[46,37],[54,37],[54,18],[60,18]]),path([['M',31,51],['L',18,51],['L',18,67],['L',31,67],['M',69,51],['L',82,51],['L',82,67],['L',69,67]],false,5)],
 protectRadiation:radiation(),keepFrozen:snowflake(),noFreeze:[...snowflake(),...slash()],
 esd:[poly([[50,8],[93,88],[7,88]],false,4),rect(35,46,30,24,false,3),path([['M',38,50],['L',30,50],['M',38,59],['L',30,59],['M',62,50],['L',70,50],['M',62,59],['L',70,59]],false,3),poly([[52,24],[43,53],[52,50],[46,76],[63,42],[53,45]])],
 keepAwayHeat:[flame(),...slash()],foodContact:[cup()],
 tidyman:[circle(29,18,7),path([['M',28,33],['L',25,55],['L',13,86],['M',25,55],['L',37,86],['M',29,36],['L',46,47],['L',61,42]],false,7),poly([[53,54],[87,54],[81,87],[60,87]],false,4),poly([[64,39],[72,43],[68,49],[60,45]])],
 readInstructions:book(),wearGloves:[glove()]
});
export const HANDLING_KEYWORDS_V82=Object.freeze({
 up:['此面向上','箭头','正置','this way up','upright'],fragile:['易碎','玻璃杯','fragile'],dry:['雨伞','防潮','防雨','keep dry','rain'],
 stackLimit:['层数','堆叠数量','stack limit number'],stackHeight:['限高','stack height'],stackWeight:['限重','承重','stack mass','stack weight'],noStack:['不可叠放','禁止堆叠','do not stack'],
 noHooks:['不用手钩','use no hooks'],noClamp:['禁止夹抱','do not clamp'],clampHere:['夹抱位置','clamp here'],slingHere:['吊装','吊带位置','sling here'],centerGravity:['中心','重心','centre of gravity','center of gravity'],
 protectHeat:['太阳','怕晒','阳光','sunlight','sun'],temperature:['温控','温度限制','temperature limits'],noRoll:['不可滚动','do not roll'],noHandTruck:['禁止小推车','no hand truck'],recycle:['循环利用','可回收','recycling']
});
