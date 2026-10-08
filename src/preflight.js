import {barcodeChecksV70} from './barcodeGroupV70.js';
import { isPackageNoticeVisible } from './variables.js';
import { elementInsidePanel, elementInsideSafeArea, generateGeometry } from './geometry.js';
import { qrMatrix } from './qrcode.js';
import { validateBarcode, validateGS1Data } from './barcode.js';
import { buildFoldGraph } from './foldgraph.js';
import { supportsVectorText } from './vectorText.js';
import { analyzeImportedGeometry } from './repair.js';
import { userTtfInfo } from './fontRegistry.js';
import { outputIccInfo } from './iccRegistry.js';
import { spotNameFor } from './printProfiles.js';
import { validatePackagingRuleState } from './rules.js';
import { validateCustomerProfile } from './customerProfiles.js';
import { validateMarkTemplate } from './markTemplates.js';

export function runPreflight(state) {
  const r = [...barcodeChecksV70(state)];
  const v = state.variables || {};
  const geo = generateGeometry(state.structure);

  r.push(...validatePackagingRuleState(state));
  const customerValidation = validateCustomerProfile(state);
  r.push({
    severity: customerValidation.ok ? 'pass' : 'error',
    title: 'Customer Profile',
    detail: customerValidation.ok ? customerValidation.profile.label : customerValidation.issues.join(' '),
  });
  const markValidation = validateMarkTemplate(state);
  r.push({
    severity: markValidation.ok ? 'pass' : 'warning',
    title: 'Mark Template',
    detail: markValidation.ok ? markValidation.template.label : `Missing: ${markValidation.missing.join(', ') || 'none'} · preset ${markValidation.presetOk ? 'ok' : 'mismatch'}`,
  });

  const required = [
    ['sku','SKU'],['nw','N.W.'],['gw','G.W.'],['crn','CRN'],['contractNo','Contract No.']
  ];
  for (const [key,label] of required) {
    const ok = String(v[key] ?? '').trim().length > 0;
    r.push({ severity: ok ? 'pass' : 'error', title: `${label} ${ok ? '已填写' : '缺失'}`, detail: ok ? String(v[key]) : `请填写 ${label}` });
  }

  const notice = state.elements.find(e=>e.id==='packageNotice');
  const needsNotice = Number(v.packageCount) > 1;
  r.push({
    severity: (!needsNotice || (notice && isPackageNoticeVisible(v))) ? 'pass' : 'error',
    title: '多包裹提示规则',
    detail: needsNotice ? 'packageCount > 1，Package Notice 将自动显示' : 'packageCount = 1，Package Notice 自动隐藏'
  });

  const pkgIndex = Number(v.packageIndex);
  const pkgCount = Number(v.packageCount);
  const pkgOk = Number.isFinite(pkgIndex) && Number.isFinite(pkgCount) && pkgIndex >= 1 && pkgIndex <= pkgCount;
  r.push({ severity: pkgOk ? 'pass':'error', title: 'Package 编号', detail: `当前 ${pkgIndex || '-'} / ${pkgCount || '-'}` });

  const group = state.elements.find(e=>e.type==='barcode-qr-group');
  if (!group) {
    r.push({ severity:'error', title:'Barcode + QR Group', detail:'缺少组合组件' });
  } else {
    const ratio = group.w / group.h;
    const ratioOk = Math.abs(ratio - 3.125) < 0.03;
    r.push({ severity:ratioOk?'pass':'warning', title:'Barcode + QR Group 比例', detail:`${group.w.toFixed?.(1) ?? group.w} × ${group.h.toFixed?.(1) ?? group.h} mm；标准比例 3.125:1` });

    const barcodeValue = String(group.barcodeValue || '').replace(/{{\s*sku\s*}}/,v.sku||'');
    const barcodeType = group.barcodeType || 'CODE39';
    const bc = validateBarcode(barcodeType, barcodeValue);
    r.push({ severity:bc.ok?'pass':'error', title:`${barcodeType} 条码检查`, detail:bc.ok?`可编码：${bc.label}`:bc.error });
    if(barcodeType==='GS1_128'){
      const gs1=validateGS1Data(barcodeValue);
      r.push({severity:gs1.ok?'pass':'error',title:'GS1 AI 语义检查',detail:gs1.ok?`${gs1.parts.length} 个 AI 已校验${gs1.warnings?.length?' · '+gs1.warnings.join('；'):''}`:gs1.error});
    }

    try {
      const qrValue = String(group.qrValue || '').replace(/{{\s*qrValue\s*}}/,v.qrValue||'').replace(/{{\s*sku\s*}}/,v.sku||'');
      const qr = qrMatrix(qrValue);
      r.push({ severity:'pass', title:'QR Code 编码', detail:`QR Version ${qr.version}-L，编码通过；${qr.bytes} bytes` });
    } catch (err) {
      r.push({ severity:'error', title:'QR Code 编码', detail:String(err?.message || err) });
    }
  }

  const visibleElements = state.elements.filter(e => !(e.type==='notice' && !isPackageNoticeVisible(v)));
  const out = visibleElements.filter(e => !elementInsidePanel(e,geo));
  r.push({
    severity: out.length ? 'warning' : 'pass',
    title: '对象边界检查',
    detail: out.length ? `${out.length} 个对象超出绑定面板：${out.map(x=>x.id).join(', ')}` : '所有可见对象均位于各自绑定面板内'
  });
  const unsafe=visibleElements.filter(e=>elementInsidePanel(e,geo)&&!elementInsideSafeArea(e,geo));
  r.push({severity:unsafe.length?'warning':'pass',title:'Safe Area 检查',detail:unsafe.length?`${unsafe.length} 个对象进入 ${geo.structure.safe} mm 安全边距：${unsafe.map(x=>x.id).join(', ')}`:`所有对象均位于 ${geo.structure.safe} mm Safe Area 内`});
  r.push({severity:'pass',title:'Bleed / Safe 几何',detail:`Bleed ${geo.structure.bleed} mm · Safe ${geo.structure.safe} mm · ${(geo.bleedRects?.length||0)+(geo.bleedPolygons?.length||0)} panels`});

  const s=geo.structure;
  r.push({ severity:s.thickness>0?'pass':'warning', title:'纸厚 / 楞型', detail:`${s.layers} 层 ${s.flute} 楞 · ${s.thickness} mm · 基础补偿 ${s.compensation?'开启':'关闭'}` });
  const graph=buildFoldGraph(geo);
  const ids=new Set(graph.nodes.map(n=>n.id));
  const badEdges=graph.edges.filter(e=>!ids.has(e.from)||!ids.has(e.to));
  r.push({severity:badEdges.length?'error':'pass',title:'Panel / Fold Graph',detail:badEdges.length?`${badEdges.length} 条 hinge 引用了不存在的 panel`:`${graph.nodes.length} panels · ${graph.edges.length} hinges · root ${graph.root}`});
  if(s.template==='imported'){
    const candidates=geo.foldCandidates||[],confirmed=candidates.filter(x=>x.confirmed),curves=[...(geo.cutCurves||[]),...(geo.creaseCurves||[]),...(geo.perfCurves||[]),...(geo.glueCurves||[])];
    r.push({severity:confirmed.length?'pass':'warning',title:'Imported Fold Confirmation',detail:`推断 ${candidates.length} 条 crease adjacency · 已确认 ${confirmed.length} 条 · graph ${graph.edges.length} hinges`});
    r.push({severity:'pass',title:'Native Curve Preservation',detail:`${curves.length} 条 Bezier / Arc 以原生控制点保存；DXF/PDF 输出会按生产兼容方式离散。`});
  }
  r.push({ severity:'warning', title:'结构补偿状态', detail:s.template==='imported'?`当前为导入 ${geo.structure?.importedGeometry?.source||'Vector'} 刀版。支持 SVG/DXF/PDF/PDF-compatible AI、原生曲线、Fold 人工确认、自由 Polygon Panel 和拓扑检查；仍须核对折叠方向和工厂补偿。`:s.template==='mailer-150010'?'Mailer 150010 当前按公开参考尺寸校准设计区与基础几何；不同纸板/设备的压线与锁扣补偿仍需包装工程师确认。':'当前为基础参数化侧封箱/RSC 补偿模型。源 PDF 未提供完整压线补偿表，正式刀模需由包装工程师确认。' });

  const rotated = visibleElements.filter(e=>Math.abs(Number(e.r)||0) > 0.001);
  r.push({ severity:rotated.length?'warning':'pass', title:'PDF 旋转兼容', detail:rotated.length?`Production PDF 暂不应用对象旋转：${rotated.map(x=>x.id).join(', ')}；SVG/PNG 会保留旋转。`:'当前无旋转对象，PDF 与 SVG 几何一致' });

  const renderedText=visibleElements.filter(e=>e.template).map(e=>String(e.template).replace(/{{\s*(\w+)\s*}}/g,(_,k)=>String(v[k]??'')));
  const vectorUnsupported=renderedText.filter(t=>!supportsVectorText(t));
  if(state.exportOptions?.outlineText){
    const mode=state.exportOptions?.fontMode||'technical',ttf=userTtfInfo();
    if(mode==='ttf')r.push({severity:ttf?'pass':'error',title:'Uploaded TTF 精确转曲',detail:ttf?`当前会话字体：${ttf.name} · ${ttf.unitsPerEm} UPM · ${ttf.numGlyphs} glyphs。SVG/PDF 直接输出该 TTF 的 glyf 轮廓，不嵌入字体文件。`:'已选择 Uploaded TTF 模式，但当前会话没有加载 .ttf 文件。请重新选择字体后再导出。'});
    else r.push({severity:vectorUnsupported.length?'warning':'pass',title:'Technical Vector Shapes',detail:vectorUnsupported.length?`${vectorUnsupported.length} 个文本包含技术矢量字库未覆盖字符，将以 ? 替代。`:'已开启内置技术矢量字形输出：SVG/PDF 不依赖外部字体。'});
  }else{
    const nonAscii = renderedText.filter(t=>/[^\x00-\x7F]/.test(t));
    r.push({ severity:nonAscii.length?'warning':'pass', title:'Production PDF 字体兼容', detail:nonAscii.length?'发现非 ASCII 文本，Base14 字体可能无法完整输出；建议使用 Uploaded TTF 精确转曲':'当前生产字段可由 Helvetica/Arial-compatible Base14 字体输出' });
  }
  const spots=state.exportOptions?.spotDielines!==false,op=state.exportOptions?.overprintDielines!==false;
  const spotSummary=['CUT','CREASE','PERF','GLUE'].map(k=>`${k}=${spotNameFor(state.exportOptions||{},k)}`).join('、');
  r.push({severity:spots&&op?'pass':'warning',title:'Spot color / Overprint',detail:spots?`${spotSummary}；Overprint ${op?'开启':'关闭'}。`:'Spot separation 已关闭，PDF 刀线将使用普通 Process Black。'});
  const pdfx=state.exportOptions?.pdfxMode==='candidate',icc=outputIccInfo();
  if(pdfx){
    const blockers=[];if(!icc)blockers.push('未加载 ICC');else if(!icc.isCmyk)blockers.push(`ICC=${icc.colorSpace||'Unknown'}，不是 CMYK`);if(!state.exportOptions?.outlineText)blockers.push('文字未转曲');if(rotated.length)blockers.push('存在 PDF 未实现旋转对象');
    r.push({severity:blockers.length?'error':'pass',title:'PDF/X-4 Candidate Gate',detail:blockers.length?`阻断：${blockers.join('；')}`:`已具备 CMYK ICC OutputIntent、XMP / GTS_PDFXVersion、TrimBox/BleedBox 与文字转曲条件。ICC: ${icc.name} · ${icc.colorSpace} · ${icc.size} bytes。仍建议使用专业 preflight 工具验证，不宣称第三方认证。`});
  }else{
    r.push({severity:'warning',title:'PDF/X readiness',detail:'当前为普通 Production PDF。可切换 PDF/X-4 Candidate，并嵌入用户提供的 CMYK ICC OutputIntent + XMP；未开启时不写 PDF/X 标识。'});
  }
  if(s.template==='imported'){
    const a=analyzeImportedGeometry(s.importedGeometry||{},Number(state.repairTolerance)||.5);
    r.push({severity:(a.degenerate||a.duplicates||a.nearEndpointPairs)?'warning':'pass',title:'Dieline topology health',detail:`Lines ${a.lineCount} · degenerate ${a.degenerate} · duplicates ${a.duplicates} · near endpoints ${a.nearEndpointPairs} @ ${a.tolerance} mm`});
    r.push({severity:(a.cutIntersections||a.polygonSelfIntersections)?'error':'pass',title:'Path intersection / self-intersection',detail:`CUT crossings ${a.cutIntersections} · Polygon self-intersections ${a.polygonSelfIntersections} · Polygon panels ${a.polygonPanels}`});
  }

  return r;
}
