# BoxStudio V0.38 — Professional Dieline CAD / Preflight / Export

**产品主线**：纸盒结构设计 + 2D 包装设计 + 3D 成盒审校 + 专业唛头 + 印前检查 + 生产文件导出  
**版本目标**：把此前分散在 parametric geometry、imported dieline、Bezier/PDF、Preflight、SVG/DXF 等模块中的能力统一到一份可编辑、可持久化、可检查、可导出的语义刀版文档。

---

## 1. 本版核心结果

V0.38 新增 `boxstudio-dieline-v38` 作为专业 Dieline CAD 的统一语义模型。它不再把刀版当作不可编辑的背景 SVG，而是显式保存：

- Node：真实毫米坐标；
- Edge：起点/终点 + `CUT / CREASE / PERF / GLUE`；
- Geometry：Line / Cubic Bézier / Arc；
- Panel：结构面语义；
- Production Zones：Bleed / Safe / Glue；
- Metadata / Settings：结构来源与生产参数。

同一份文档现在同时进入：

1. Dieline CAD 浏览器编辑；
2. Structural Preflight；
3. 1:1 SVG；
4. DXF；
5. Dieline-only vector PDF。

这消除了“画布编辑一套数据、生产导出仍读另一套刀版”的一部分历史风险。

---

## 2. Professional Dieline CAD

### 已实现

- [x] 精确 X / Y mm Node Inspector；
- [x] Canvas 上直接拖动 Node；
- [x] Edge 选择；
- [x] `CUT ↔ CREASE ↔ PERF ↔ GLUE` 转换；
- [x] Line → Cubic Bézier；
- [x] Line / Cubic → Arc；
- [x] Cubic C1 / C2 数值编辑；
- [x] Cubic C1 / C2 可视控制柄与直接拖动；
- [x] Add Node on Edge；
- [x] Cubic Add Node 使用 de Casteljau 精确拆分，不破坏曲线形状；
- [x] degree-2 直线节点安全删除与边合并；
- [x] 编辑后的语义刀版持久化为项目 `dielineV38`；
- [x] Bleed / Safe 参数编辑；
- [x] CAD 工作区内直接运行 Preflight；
- [x] CAD 工作区内直接导出 SVG / DXF / Dieline PDF。

### Fail-closed 边界

- Native Arc Add Node 尚未实现时返回 `ARC_SPLIT_UNSUPPORTED`，不会静默改成错误的近似结构；
- 曲线节点删除/合并在没有可靠连续性算法时返回 `CURVE_MERGE_UNSUPPORTED`；
- 不支持的线型不能写入文档。

---

## 3. Structural Preflight

V0.38 保留原有 Preflight 的唛头、变量、Barcode、QR、字体、Safe Area、PDF/X 等检查，并增加刀版本体检查。

### 已增加

- [x] Missing Node Reference；
- [x] Degenerate Edge；
- [x] Missing Cubic Handles；
- [x] Invalid Arc Radius；
- [x] Duplicate Edge；
- [x] CUT Line Intersection；
- [x] Open CUT Endpoint warning；
- [x] Bleed Zone Coverage；
- [x] Safe Zone Coverage；
- [x] Artwork crossing edited CREASE；
- [x] Raster image effective DPI（有像素元数据时）；
- [x] Missing DPI metadata warning；
- [x] CAD 修改 CUT/CREASE 语义后触发 `FOLD_GRAPH_REVIEW_REQUIRED`；
- [x] Polygon panel 在没有真实 Offset 引擎时触发 `POLYGON_OFFSET_REVIEW`。

### 重要原则

Preflight 对编辑后的 `dielineV38` 进行新增结构检查，而不是仍只对原始 parametric geometry 做检查。

---

## 4. Production Dieline Export

### SVG

- [x] `width/height` 使用 mm；
- [x] 1:1 `viewBox`；
- [x] 原生 Cubic Bézier；
- [x] 原生 SVG Arc；
- [x] CUT / CREASE / PERF / GLUE 分组；
- [x] Spot metadata：`CutContour / Crease / Perforation`；
- [x] Bleed / Safe layer。

### DXF

- [x] AC1015；
- [x] `$INSUNITS = 4`（mm）；
- [x] CUT / CREASE / PERF / GLUE / BLEED / SAFE layer；
- [x] 曲线按受控采样输出 LINE entities；
- [x] 生产尺寸保持毫米坐标。

### Dieline PDF

- [x] 1:1 mm → pt MediaBox / TrimBox；
- [x] Vector path；
- [x] Separation Spot Color resources；
- [x] CutContour / Crease / Perforation / Glue；
- [x] 浏览器与 Node 双环境生成。

---

## 5. 真实 CI 发现并修复的问题

V0.38 的浏览器验收没有一次性“做绿”，而是实际找到了两类问题。

### 5.1 SVG element interaction driver

Headless Chrome 中 `SVGPathElement` 不保证存在 HTMLElement 风格 `.click()`。第一次浏览器门因此失败。

修复方式：测试驱动改为发送真实 `MouseEvent('click')`。业务功能没有通过放宽断言来绕过。

### 5.2 Dieline PDF 浏览器崩溃

Domain 测试在 Node 中通过，但真实浏览器调用 PDF builder 时出现：

```text
ReferenceError: Buffer is not defined
```

原因：PDF xref / stream length 使用了 Node-only `Buffer.byteLength`。

修复方式：生产模块改为 `TextEncoder` 计算 UTF-8 byte length；同一 PDF builder 现在可在 Browser 和 Node 使用。

---

## 6. Browser E2E 验收链

V0.38 专用 Headless Chrome 门真实执行：

1. 打开 Dieline CAD；
2. 验证语义刀版写入项目状态；
3. 选择真实 SVG Edge；
4. CUT → CREASE；
5. Edge → Cubic Bézier；
6. Add Node；
7. 精确 Node X 数值编辑；
8. 直接拖动新增 Node；
9. 选择真实 Cubic Edge；
10. 拖动 C1 Bézier handle；
11. 运行 Preflight；
12. 从已编辑刀版生成 DXF；
13. 从已编辑刀版生成 SVG；
14. 从已编辑刀版生成 Dieline PDF。

因此 V0.38 的浏览器验收不是只验证页面存在。

---

## 7. 明确未完成 / 不虚报

### 7.1 Panel / Fold Topology 同步仍需继续

V0.38 的 Node/Edge 可以编辑，但任意边界移动后，Panel polygon、Panel rect、Fold Graph 还没有完整自动重建。当前通过 `FOLD_GRAPH_REVIEW_REQUIRED` 明确暴露风险。

### 7.2 Arbitrary Polygon / Bézier Offset

当前 Bleed / Safe 自动区主要覆盖矩形 panel。任意 polygon / Bezier 的真实平行 Offset、尖角/圆角 join、self-intersection repair 尚未完成，因此使用 `POLYGON_OFFSET_REVIEW`，不能称为完整生产级 Offset。

### 7.3 Full Artwork Production PDF

V0.38 的新语义文档已经驱动 **Dieline-only SVG / DXF / PDF**。旧的完整 Artwork Production PDF 仍有自己的成熟生产链，但尚不能声称“任意 CAD 编辑后的新 Panel topology 会自动重排所有 artwork 并进入最终 Production PDF”。这是下一阶段核心缺口。

### 7.4 DXF 外部 CAD 验收

内部已验证 layer 和 mm 单位，但 AutoCAD / ArtiosCAD / Esko / 刀模厂软件的真实 round-trip 仍属于 EXT。

### 7.5 Factory compensation

压线中心、crease allowance、纸板压缩、楞型实际补偿、刀模公差仍需要工厂/样箱实测。

---

## 8. V0.38 后的主线

下一阶段不应回到 ERP/SSO 扩张，而应继续纸盒设计核心：

1. Panel polygon ↔ edited edge topology rebuild；
2. Fold Graph 自动重建与人工 override；
3. Polygon/Bezier Offset engine；
4. edited Dieline → full Artwork Production PDF；
5. 专业 Dimension / Slot / Notch / Tab structural tools；
6. DXF/SVG/PDF round-trip fixtures；
7. 扩展 20–30 个生产常用盒型并做真实 CAD/样箱验收。
