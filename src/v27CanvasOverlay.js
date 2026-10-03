import { STORAGE_KEY, defaultState } from './model.js';
import { generateGeometry } from './geometry.js';
import { orderedElements } from './objectOrder.js';
import { getCrossSelection, setCrossSelection, toggleCrossSelection, translateCrossSelection, resizeCrossElement, rotateCrossElement, selectionBounds } from './crossPanelTransformV21.js';
import { scaleCrossSelection, rotateCrossSelection } from './crossPanelTransformV22.js';
import { smartSpacingDelta } from './smartSpacingV23.js';
import { smartAlignmentDeltaV25, smartSizeMatchV25 } from './smartGuidesV25.js';
import { liveTranslationAssistV27, liveRotationAssistV27 } from './liveAssistV27.js';
import { crossClipNodes, clipGeometryV25, clipNormalizedToDocumentV25, moveClipAnchorV25, moveClipHandleV25, insertClipNodeV25, removeClipNodeV25 } from './clipPathV25.js';

const NS='http://www.w3.org/2000/svg',clone=v=>structuredClone(v),num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
function readState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,crossPanelEdit:{...defaultState.crossPanelEdit,...(p.crossPanelEdit||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function writeState(s){s.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}
function make(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n}
function svgPoint(svg,e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0}}
function rotatePoint(x,y,cx,cy,deg=0){const a=num(deg)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-cx,dy=y-cy;return[cx+dx*c-dy*s,cy+dx*s+dy*c]}
function add(a,b){return[a[0]+b[0],a[1]+b[1]]}
function cubic(p0,c1,c2,p3,t=.5){const u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;return[a*p0[0]+b*c1[0]+c*c2[0]+d*p3[0],a*p0[1]+b*c1[1]+c*p2(p2=>p2)(0)+d*p3[1]]}
