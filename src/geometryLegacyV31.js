export const BASE_PX_PER_MM = 0.27;

export const TEMPLATE_DEFAULTS = {
  'side-seal-rsc': {
    template: 'side-seal-rsc',
    sizeType: 'internal',
    length: 1200,
    width: 600,
    height: 200,
    thickness: 6.5,
    glue: 50,
    flute: 'BC',
    layers: 5,
    burstPsi: 250,
    tolerance: 5,
    print: 'Single Black',
    compensation: true,
    bleed: 3,
    safe: 5,
  },
  'mailer-150010': {
    template: 'mailer-150010',
    sizeType: 'internal',
    length: 300,
    width: 200,
    height: 60,
    thickness: 1.5,
    glue: 0,
    flute: 'E',
    layers: 3,
    burstPsi: 0,
    tolerance: 2,
    print: 'Artwork + Dieline',
    compensation: true,
    wing: 73,
    bleed: 3,
    safe: 5,
  },
  'imported': {
    template: 'imported', sizeType:'artboard', length:300, width:200, height:60,
    thickness:1.5, glue:0, flute:'CUSTOM', layers:1, burstPsi:0, tolerance:0,
    print:'Imported vector', compensation:false, importedGeometry:null, bleed:3, safe:5,
  },
};

export const defaultStructure = { ...TEMPLATE_DEFAULTS['side-seal-rsc'] };

function n(v, fallback=0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export function defaultsForTemplate(template='side-seal-rsc') {
  return structuredClone(TEMPLATE_DEFAULTS[template] || TEMPLATE_DEFAULTS['side-seal-rsc']);
}

export function normalizeStructure(input = {}) {
  const base = TEMPLATE_DEFAULTS[input.template] || TEMPLATE_DEFAULTS['side-seal-rsc'];
  const s = { ...base, ...input };
  s.template = TEMPLATE_DEFAULTS[s.template] ? s.template : 'side-seal-rsc';
  s.length = Math.max(80, n(s.length, base.length));
  s.width = Math.max(60, n(s.width, base.width));
  s.height = Math.max(25, n(s.height, base.height));
  s.thickness = Math.max(0, n(s.thickness, base.thickness));
  s.glue = Math.max(0, n(s.glue, base.glue || 0));
  s.layers = Math.max(1, Math.round(n(s.layers, base.layers || 1)));
  s.burstPsi = Math.max(0, n(s.burstPsi, base.burstPsi || 0));
  s.tolerance = Math.max(0, n(s.tolerance, base.tolerance || 0));
  s.wing = Math.max(15, n(s.wing, Math.max(s.height, s.width * .365)));
  s.bleed = Math.max(0, n(s.bleed, base.bleed ?? 3));
  s.safe = Math.max(0, n(s.safe, base.safe ?? 5));
  s.compensation = Boolean(s.compensation);
  return s;
}

export function manufacturingDimensions(input) {
  const s = normalizeStructure(input);
  const t = s.compensation ? s.thickness : 0;
  if (s.template === 'imported') {
    return {L:s.length,W:s.width,H:s.height,T:s.thickness,glue:0};
  }
  if (s.template === 'mailer-150010') {
    // Engineering approximation. The 300×200×60 / 1.5 mm public reference reports
    // manufacture dimensions 315×202×62 mm. We preserve the known W/H allowance
    // and expose L allowance as an editable, conservative structural allowance.
    return {
      L: s.length + Math.max(t * 2, s.height * .025),
      W: s.width + t * 1.35,
      H: s.height + t * 1.35,
      T: s.thickness,
      glue: 0,
    };
  }
  return {
    L: s.length + t,
    W: s.width + t,
    H: s.height + t * 2,
    T: s.thickness,
    glue: s.glue,
  };
}

function line(x1,y1,x2,y2,type='CUT') { return { x1,y1,x2,y2,type }; }
function panel(id,label,x,y,w,h,kind='panel',extra={}) { return {id,label,x,y,w,h,kind,...extra}; }

function generateRsc(input) {
  const s = normalizeStructure(input);
  const m = manufacturingDimensions(s);
  const margin = 70;
  const flap = Math.max(25, m.W / 2);
  const bodyY = margin + flap;
  const bodyH = m.H;
  const bodyBottom = bodyY + bodyH;

  const specs = [
    ['glue', 'GLUE', m.glue, 'glue'],
    ['left', 'LEFT', m.W, 'panel'],
    ['front', 'FRONT', m.L, 'panel'],
    ['right', 'RIGHT', m.W, 'panel'],
    ['back', 'BACK', m.L, 'panel'],
  ];

  let x = margin;
  const bodyPanels = [];
  for (const [id,label,w,kind] of specs) {
    if (w <= 0) continue;
    bodyPanels.push(panel(id,label,x,bodyY,w,bodyH,kind));
    x += w;
  }
  const bodyEnd = x;

  const flapPanels = [];
  for (const p of bodyPanels) {
    if (p.id === 'glue') continue;
    flapPanels.push(panel(`top-${p.id}`,`TOP ${p.label}`,p.x,margin,p.w,flap,'flap',{parent:p.id,role:'top-flap'}));
    flapPanels.push(panel(`bottom-${p.id}`,`BOTTOM ${p.label}`,p.x,bodyBottom,p.w,flap,'flap',{parent:p.id,role:'bottom-flap'}));
  }

  const cutLines = [];
  const gluePanel = bodyPanels.find(p=>p.id==='glue');
  const mainPanels = bodyPanels.filter(p => p.kind === 'panel');
  if (gluePanel) {
    cutLines.push(line(gluePanel.x, bodyY, gluePanel.x, bodyBottom));
    cutLines.push(line(gluePanel.x, bodyY, gluePanel.x + gluePanel.w, bodyY));
    cutLines.push(line(gluePanel.x, bodyBottom, gluePanel.x + gluePanel.w, bodyBottom));
  }
  for (const p of mainPanels) {
    cutLines.push(line(p.x, margin, p.x + p.w, margin));
    cutLines.push(line(p.x, bodyBottom + flap, p.x + p.w, bodyBottom + flap));
  }
  if (mainPanels.length) {
    cutLines.push(line(mainPanels[0].x, margin, mainPanels[0].x, bodyY));
    cutLines.push(line(mainPanels[0].x, bodyBottom, mainPanels[0].x, bodyBottom + flap));
    const last = mainPanels[mainPanels.length - 1];
    cutLines.push(line(last.x + last.w, margin, last.x + last.w, bodyY));
    cutLines.push(line(last.x + last.w, bodyY, last.x + last.w, bodyBottom));
    cutLines.push(line(last.x + last.w, bodyBottom, last.x + last.w, bodyBottom + flap));
    for (let i=1; i<mainPanels.length; i++) {
      const bx = mainPanels[i].x;
      cutLines.push(line(bx, margin, bx, bodyY));
      cutLines.push(line(bx, bodyBottom, bx, bodyBottom + flap));
    }
    if (gluePanel) {
      cutLines.push(line(gluePanel.x + gluePanel.w, margin, gluePanel.x + gluePanel.w, bodyY));
      cutLines.push(line(gluePanel.x + gluePanel.w, bodyBottom, gluePanel.x + gluePanel.w, bodyBottom + flap));
    }
  }

  const creaseLines = [];
  if (mainPanels.length) {
    creaseLines.push(line(mainPanels[0].x, bodyY, bodyEnd, bodyY, 'CREASE'));
    creaseLines.push(line(mainPanels[0].x, bodyBottom, bodyEnd, bodyBottom, 'CREASE'));
  }
  for (let i=1; i<bodyPanels.length; i++) {
    const bx = bodyPanels[i].x;
    creaseLines.push(line(bx, bodyY, bx, bodyBottom, 'CREASE'));
  }

  const width = bodyEnd + margin;
  const height = bodyBottom + flap + margin;
  const panels = [...bodyPanels, ...flapPanels];
  const panelMap = Object.fromEntries(panels.map(p => [p.id,p]));

  return {
    template:'side-seal-rsc', structure:s, manufacturing:m, width,height,margin,flap,bodyY,bodyBottom,
    bodyPanels, flapPanels, panels, panelMap, cutLines, creaseLines,
    perfLines:[], glueLines: gluePanel ? [line(gluePanel.x,bodyY,gluePanel.x+gluePanel.w,bodyY,'GLUE')] : [],
    documentTitle:'US Side-Seal Carton / RSC Parametric Base',
  };
}

function generateMailer150010(input) {
  const s = normalizeStructure({...input,template:'mailer-150010'});
  const m = manufacturingDimensions(s);
  const L = s.length, W = s.width, H = s.height;
  const margin = 5;
  // Calibrated default: 300×200×60 -> 576×590 mm design area.
  const wing = Math.max(H, n(s.wing, W*.365));
  const xBase = margin + wing + H;
  const yTuck = margin;
  const yLid = yTuck + H;
  const yBack = yLid + W;
  const yBase = yBack + H;
  const yFront = yBase + W;
  const width = margin*2 + wing*2 + H*2 + L;
  const height = margin*2 + W*2 + H*3;

  const bodyPanels = [
    panel('left','LEFT WALL',xBase-H,yBase,H,W,'panel',{role:'side-wall'}),
    panel('base','BASE',xBase,yBase,L,W,'panel',{role:'base'}),
    panel('right','RIGHT WALL',xBase+L,yBase,H,W,'panel',{role:'side-wall'}),
    panel('back','BACK WALL',xBase,yBack,L,H,'panel',{role:'back-wall'}),
    panel('front','FRONT WALL',xBase,yFront,L,H,'panel',{role:'front-wall'}),
    panel('lid','LID',xBase,yLid,L,W,'panel',{role:'lid'}),
    panel('lid-tuck','LID TUCK',xBase,yTuck,L,H,'panel',{role:'lid-tuck'}),
  ];
  const flapPanels = [
    panel('left-wing','LEFT LOCK WING',margin,yBase,wing,W,'flap',{parent:'left',role:'lock-wing'}),
    panel('right-wing','RIGHT LOCK WING',xBase+L+H,yBase,wing,W,'flap',{parent:'right',role:'lock-wing'}),
    panel('lid-left','LID LEFT FLAP',xBase-H,yLid,H,W,'flap',{parent:'lid',role:'lid-side-flap'}),
    panel('lid-right','LID RIGHT FLAP',xBase+L,yLid,H,W,'flap',{parent:'lid',role:'lid-side-flap'}),
    panel('back-left-tab','BACK LEFT TAB',xBase-H,yBack,H,H,'flap',{parent:'back',role:'back-tab'}),
    panel('back-right-tab','BACK RIGHT TAB',xBase+L,yBack,H,H,'flap',{parent:'back',role:'back-tab'}),
    panel('front-left-tab','FRONT LEFT TAB',xBase-H,yFront,H,H,'flap',{parent:'front',role:'front-tab'}),
    panel('front-right-tab','FRONT RIGHT TAB',xBase+L,yFront,H,H,'flap',{parent:'front',role:'front-tab'}),
  ];

  const cutLines=[];
  const creaseLines=[];
  // Central vertical stack outer cuts.
  cutLines.push(line(xBase,yTuck,xBase+L,yTuck));
  cutLines.push(line(xBase,yTuck,xBase,yLid));
  cutLines.push(line(xBase+L,yTuck,xBase+L,yLid));
  // Lid side flaps outer boundary.
  cutLines.push(line(xBase-H,yLid,xBase-H,yLid+W));
  cutLines.push(line(xBase-H,yLid,xBase,yLid));
  cutLines.push(line(xBase-H,yLid+W,xBase,yLid+W));
  cutLines.push(line(xBase+L,yLid,xBase+L+H,yLid));
  cutLines.push(line(xBase+L+H,yLid,xBase+L+H,yLid+W));
  cutLines.push(line(xBase+L,yLid+W,xBase+L+H,yLid+W));
  // Side / lock-wing outer boundary around base.
  cutLines.push(line(margin,yBase,margin,yBase+W));
  cutLines.push(line(margin,yBase,xBase-H,yBase));
  cutLines.push(line(margin,yBase+W,xBase-H,yBase+W));
  cutLines.push(line(xBase+L+H,yBase,xBase+L+H+wing,yBase));
  cutLines.push(line(xBase+L+H+wing,yBase,xBase+L+H+wing,yBase+W));
  cutLines.push(line(xBase+L+H,yBase+W,xBase+L+H+wing,yBase+W));
  // Front wall outer bottom and tab edges.
  cutLines.push(line(xBase,yFront+H,xBase+L,yFront+H));
  cutLines.push(line(xBase-H,yFront,xBase-H,yFront+H));
  cutLines.push(line(xBase-H,yFront+H,xBase,yFront+H));
  cutLines.push(line(xBase+L+H,yFront,xBase+L+H,yFront+H));
  cutLines.push(line(xBase+L,yFront+H,xBase+L+H,yFront+H));
  // Back tabs transitions / exposed shoulders.
  cutLines.push(line(xBase-H,yBack,xBase-H,yBack+H));
  cutLines.push(line(xBase-H,yBack,xBase,yBack));
  cutLines.push(line(xBase+L,yBack,xBase+L+H,yBack));
  cutLines.push(line(xBase+L+H,yBack,xBase+L+H,yBack+H));

  // Main horizontal folds.
  creaseLines.push(line(xBase,yLid,xBase+L,yLid,'CREASE'));
  creaseLines.push(line(xBase,yBack,xBase+L,yBack,'CREASE'));
  creaseLines.push(line(xBase,yBase,xBase+L,yBase,'CREASE'));
  creaseLines.push(line(xBase,yFront,xBase+L,yFront,'CREASE'));
  // Base side wall folds.
  creaseLines.push(line(xBase,yBase,xBase,yBase+W,'CREASE'));
  creaseLines.push(line(xBase+L,yBase,xBase+L,yBase+W,'CREASE'));
  // Lock wing folds.
  creaseLines.push(line(xBase-H,yBase,xBase-H,yBase+W,'CREASE'));
  creaseLines.push(line(xBase+L+H,yBase,xBase+L+H,yBase+W,'CREASE'));
  // Lid side flap folds.
  creaseLines.push(line(xBase,yLid,xBase,yLid+W,'CREASE'));
  creaseLines.push(line(xBase+L,yLid,xBase+L,yLid+W,'CREASE'));
  // Tabs around back/front wall.
  creaseLines.push(line(xBase,yBack,xBase,yBack+H,'CREASE'));
  creaseLines.push(line(xBase+L,yBack,xBase+L,yBack+H,'CREASE'));
  creaseLines.push(line(xBase,yFront,xBase,yFront+H,'CREASE'));
  creaseLines.push(line(xBase+L,yFront,xBase+L,yFront+H,'CREASE'));

  const panels=[...bodyPanels,...flapPanels];
  const panelMap=Object.fromEntries(panels.map(p=>[p.id,p]));
  return {
    template:'mailer-150010', structure:s, manufacturing:m, width,height,margin,flap:H,bodyY:yBase,bodyBottom:yBase+W,
    bodyPanels,flapPanels,panels,panelMap,cutLines,creaseLines,perfLines:[],glueLines:[],
    documentTitle:'Mailer / Flip-top 150010 Parametric Base',
    reference:{inside:'300×200×60 mm',manufacture:'315×202×62 mm',outside:'316×204.5×63 mm',designArea:'576×590 mm',material:'E-flute 1.5 mm'},
  };
}


function generateImported(input){
  const s=normalizeStructure({...input,template:'imported'}),src=input.importedGeometry;
  if(!src){
    const p=panel('artboard','Imported Artboard',0,0,Math.max(100,s.length),Math.max(100,s.width),'panel');
    return {template:'imported',structure:s,manufacturing:manufacturingDimensions(s),width:p.w,height:p.h,margin:0,flap:0,bodyY:0,bodyBottom:p.h,bodyPanels:[p],flapPanels:[],panels:[p],panelMap:{artboard:p},cutLines:[],creaseLines:[],perfLines:[],glueLines:[],documentTitle:'Imported Dieline'};
  }
  const panels=(src.panels?.length?src.panels:[panel('artboard','Imported Artboard',0,0,src.width,src.height,'panel')]).map((p,i)=>({...p,id:p.id||`panel-${i+1}`,label:p.label||`Panel ${i+1}`,kind:p.kind||'panel'}));
  const panelMap=Object.fromEntries(panels.map(p=>[p.id,p]));
  return {template:'imported',structure:s,manufacturing:manufacturingDimensions(s),width:Number(src.width)||300,height:Number(src.height)||200,margin:0,flap:0,bodyY:0,bodyBottom:Number(src.height)||200,bodyPanels:panels.filter(p=>p.kind==='panel'),flapPanels:panels.filter(p=>p.kind!=='panel'),panels,panelMap,cutLines:structuredClone(src.cutLines||[]),creaseLines:structuredClone(src.creaseLines||[]),perfLines:structuredClone(src.perfLines||[]),glueLines:structuredClone(src.glueLines||[]),cutCurves:structuredClone(src.cutCurves||[]),creaseCurves:structuredClone(src.creaseCurves||[]),perfCurves:structuredClone(src.perfCurves||[]),glueCurves:structuredClone(src.glueCurves||[]),foldCandidates:structuredClone(src.foldCandidates||[]),foldRoot:src.foldRoot||panels[0]?.id||'artboard',documentTitle:`Imported ${src.source||'Vector'} Dieline`,importWarnings:src.warnings||[]};
}

function signedArea(points=[]){let a=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];a+=(p[0]*q[1]-q[0]*p[1])}return a/2}
function lineIntersection(a,b,c,d){const A1=b[1]-a[1],B1=a[0]-b[0],C1=A1*a[0]+B1*a[1],A2=d[1]-c[1],B2=c[0]-d[0],C2=A2*c[0]+B2*c[1],det=A1*B2-A2*B1;if(Math.abs(det)<1e-8)return null;return[(B2*C1-B1*C2)/det,(A1*C2-A2*C1)/det]}
export function offsetPolygon(points=[],distance=0){
  if(points.length<3||Math.abs(distance)<1e-9)return points.map(p=>[Number(p[0]),Number(p[1])]);const area=signedArea(points),out=[];
  const offsetEdge=(p,q)=>{const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1;const nx=(area>0?dy:-dy)/len,ny=(area>0?-dx:dx)/len;return[[p[0]+nx*distance,p[1]+ny*distance],[q[0]+nx*distance,q[1]+ny*distance]]};
  for(let i=0;i<points.length;i++){const prev=points[(i-1+points.length)%points.length],cur=points[i],next=points[(i+1)%points.length],e1=offsetEdge(prev,cur),e2=offsetEdge(cur,next),hit=lineIntersection(e1[0],e1[1],e2[0],e2[1]);out.push(hit||[(e1[1][0]+e2[0][0])/2,(e1[1][1]+e2[0][1])/2])}return out;
}
export function pointInPolygon(x,y,points=[]){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1],cross=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);if(cross)inside=!inside}return inside}
function withGuides(g){
  const bleed=Number(g.structure?.bleed||0),safe=Number(g.structure?.safe||0),guidePanels=(g.bodyPanels||[]).filter(p=>p.kind==='panel'),rects=guidePanels.filter(p=>!p.points?.length),polys=guidePanels.filter(p=>p.points?.length>=3);
  return {...g,bleedRects:rects.map(p=>({panelId:p.id,x:p.x-bleed,y:p.y-bleed,w:p.w+bleed*2,h:p.h+bleed*2})),safeRects:rects.map(p=>({panelId:p.id,x:p.x+safe,y:p.y+safe,w:Math.max(0,p.w-safe*2),h:Math.max(0,p.h-safe*2)})),bleedPolygons:polys.map(p=>({panelId:p.id,points:offsetPolygon(p.points,bleed)})),safePolygons:polys.map(p=>({panelId:p.id,points:offsetPolygon(p.points,-safe)}))};
}

export function generateGeometry(input) {
  const s = normalizeStructure(input);
  if(s.template==='imported') return withGuides(generateImported(input));
  return withGuides(s.template === 'mailer-150010' ? generateMailer150010(s) : generateRsc(s));
}

export function panelForPoint(geo, x, y, bodyOnly=true) {
  const list = bodyOnly ? geo.bodyPanels.filter(p=>p.kind==='panel') : geo.panels;
  return list.find(p => p.points?.length>=3 ? pointInPolygon(x,y,p.points) : (x >= p.x && x <= p.x+p.w && y >= p.y && y <= p.y+p.h)) || null;
}

export function resolveElementRect(el, geo) {
  const p = geo.panelMap[el.panelId] || geo.panelMap.front || geo.bodyPanels.find(x=>x.kind==='panel');
  if (!p) return {...el,absX:Number(el.x||0),absY:Number(el.y||0),panel:null};
  return { ...el, absX: p.x + Number(el.x || 0), absY: p.y + Number(el.y || 0), panel: p };
}

export function clampElementToPanel(el, geo) {
  const p = geo.panelMap[el.panelId] || geo.panelMap.front || geo.bodyPanels.find(x=>x.kind==='panel');
  if (!p) return {...el};
  const next = { ...el };
  next.w = Math.max(4, n(next.w, 4));
  next.h = Math.max(4, n(next.h, 4));
  next.x = Math.max(0, Math.min(Math.max(0,p.w-next.w), n(next.x, 0)));
  next.y = Math.max(0, Math.min(Math.max(0,p.h-next.h), n(next.y, 0)));
  next.r = n(next.r,0);
  return next;
}

export function elementInsidePanel(el, geo) {
  const p = geo.panelMap[el.panelId];if (!p) return false;const x=Number(el.x),y=Number(el.y),w=Number(el.w),h=Number(el.h);
  if(p.points?.length>=3){const corners=[[p.x+x,p.y+y],[p.x+x+w,p.y+y],[p.x+x+w,p.y+y+h],[p.x+x,p.y+y+h]];return corners.every(q=>pointInPolygon(q[0],q[1],p.points))}
  return x >= 0 && y >= 0 && x+w <= p.w && y+h <= p.h;
}

export function reanchorElementByAbsolute(el, geo, absX, absY) {
  const cx = absX + el.w/2;
  const cy = absY + el.h/2;
  const target = panelForPoint(geo, cx, cy, true) || geo.panelMap[el.panelId] || geo.panelMap.front || geo.bodyPanels[0];
  if (!target) return {...el};
  return clampElementToPanel({ ...el, panelId:target.id, x:absX-target.x, y:absY-target.y }, geo);
}

export function fitCssSize(geo, zoom=100) {
  const scale = BASE_PX_PER_MM * (Number(zoom) || 100) / 100;
  return { width: geo.width * scale, height: geo.height * scale };
}

export function uniqueLines(lines) {
  const seen = new Set();
  const out = [];
  for (const l of lines) {
    const a = [l.x1,l.y1,l.x2,l.y2];
    const b = [l.x2,l.y2,l.x1,l.y1];
    const ka=a.join(','), kb=b.join(',');
    if (seen.has(ka)||seen.has(kb)) continue;
    seen.add(ka); out.push(l);
  }
  return out;
}

export function elementInsideSafeArea(el, geo){const p=geo.panelMap[el.panelId];if(!p)return false;const safe=Number(geo.structure?.safe||0),x=Number(el.x),y=Number(el.y),w=Number(el.w),h=Number(el.h);if(p.points?.length>=3){const guide=(geo.safePolygons||[]).find(q=>q.panelId===p.id)?.points||offsetPolygon(p.points,-safe),corners=[[p.x+x,p.y+y],[p.x+x+w,p.y+y],[p.x+x+w,p.y+y+h],[p.x+x,p.y+y+h]];return corners.every(q=>pointInPolygon(q[0],q[1],guide))}return x>=safe&&y>=safe&&x+w<=p.w-safe&&y+h<=p.h-safe}
