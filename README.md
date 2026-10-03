# BoxStudio V0.19

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof + SVG Appearance + Cross-panel Production Artwork**。

## V0.19 新增

### 1. SVG Appearance 正式进入 Production Export

V0.18 的安全 SVG Appearance 不再只用于 3D Proof。

新增：

- `src/productionAppearance.js`
- `src/exportV19.js`

V0.19 Production Path 支持：

- Solid Fill → Vector Polygon
- Linear Gradient → Vector Triangle Tessellation
- Radial Gradient → Vector Triangle Tessellation
- Basic Geometric `clipPath`
- Basic Binary Geometric Mask
- `opacity / fill-opacity` 的当前生产近似
- Imported SVG Outline Vector

Gradient 仍保持纯矢量输出，但当前 PDF serializer 使用确定性的 flat-color triangle tessellation，而不是 native PDF shading。

当前透明度在这一 serializer 中预混到白底，不是 PDF transparency group。

### 2. V0.19 Production SVG / PDF

新增独立的：

- `Export V0.19 Production PDF`
- `Export V0.19 Production SVG`

V0.19 Production Path 保留：

- CUT / CREASE / PERF / GLUE
- Existing Spot / Overprint Path
- Text / Technical Vector Text
- User TTF Outline
- Barcode + QR
- Shipping Symbols
- Imported SVG Outline
- V0.19 Supported Appearance Fill
- Cross-panel Clipped Artwork

Batch Worker 也已经切换到 `buildProductionPdfV19()`，因此批量 PDF 与 V0.19 单张生产 PDF 使用同一 appearance-aware serializer。

> Imported SVG fill 当前以 DeviceRGB vector fill 进入 V0.19 PDF。即使加载了 CMYK ICC OutputIntent，V0.19 也不宣称已经完成 SVG RGB → Output CMYK 的 ICC 色彩转换。

### 3. Cross-panel Artwork Object

新增：

- `src/crossPanelArtwork.js`

Panel-local SVG Mark 可以提升为 document-global：

```text
cross-panel-artwork
```

Production Materialization 时会：

1. 将 artwork 放到整个展开图坐标系；
2. 生成 fill / gradient approximation / outline；
3. 与所有相交 Panel 求交；
4. Fill 自动切成 Panel-local vector fragments；
5. Outline 在线框边界处自动裁切；
6. 各 fragment 再进入 SVG / PDF 输出。

V0.19 Workspace 允许调整：

- X
- Y
- W
- H

并显示：

- Touched Panels
- Fill Fragments
- Outline Fragments
- `cross-panel / single-panel / outside`

这是真正的显式跨 Panel Artwork Object，与 V0.18 仅检查折线两侧 artwork 的 Bleed Continuity Diagnostic 不同。

### 4. Gradient Percentage Regression Fix

生产 Gradient Materializer 已修复百分比坐标解析：

```text
0% → 100%
```

现在会按 painted primitive bounds 正确解析，不会因为百分号导致 gradient axis 退化。

自动测试会验证同一 gradient 最终生成多个不同 vector fill colors。

### 5. V0.19 Production Workspace

新增：

- `src/v19Ui.js`
- `src/v19Ui.css`

显示：

- SVG Appearance Mark Count
- Fill Primitive Count
- Gradient Source Count
- Production Polygon Count
- Cross-panel Artwork Count
- Appearance Warning Count
- V0.19 SVG / PDF Export
- SVG → Cross-panel Promotion
- Cross-panel Bounds Editor
- Fragment Diagnostics

V0.18 Folded Artwork Proof 继续保留，不会因为 V0.19 Production Workspace 被隐藏。

## V0.18 / V0.17 能力继续保留

### SVG Appearance Proof

- Solid Fill
- Linear / Radial Gradient
- Basic ClipPath
- Binary Geometric Mask
- Opacity / Fill Opacity
- Rect / Polygon / Circle / Ellipse
- Simple M/L/H/V/Z Closed Path Fill
- Safe warning collection

安全 SVG Import 继续拒绝：

- `script`
- `foreignObject`
- `iframe`
- `object`
- `embed`
- `image`
- `use`
- External URL
- data/javascript references

当前仍不是完整 Illustrator Appearance：CSS selector cascade、complex curved filled path、gradientTransform、real luminance mask、pattern/filter/blend/raster fidelity 尚未完整实现。

### Folded Artwork Texture Proof

- Panel Artwork Atlas → Folded Panel Texture
- Polygon UV
- Ear-clipping Triangulation
- Fold Seam UV Diagnostics
- Fold 0–100%
- Pointer Orbit
- Wheel Zoom
- Depth Sorting
- Panel Wireframe
- Fold Bleed Continuity Diagnostics

浏览器 3D Proof 仍走 Canvas / sRGB 显示路径，不宣称 ICC PCS display conversion 或 monitor-calibrated soft proof。

## 已有核心能力

### 结构 / 刀版

- Parametric Side-Seal / RSC
- Mailer 150010
- SVG / DXF / PDF / PDF-compatible AI 导入
- CUT / CREASE / PERF / GLUE
- Bezier / Arc
- Polygon Panel
- Panel / Fold Graph
- CREASE → Fold Candidate
- CUT Crossing / Polygon Self-intersection 检查
- Bleed / Safe Area
- Topology Repair

工厂压线补偿、刀模板补偿和设备公差只接受已验证生产数据，不自动编造。

### 唛头 / 条码

- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.
- Origin / Destination / Package No.
- Multi-package Notice
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR Locked Group
- 250×80 mm / 200×64 mm
- This Side Up / Fragile / Keep Dry
- Custom Mark Template / Mark Asset
- Panel-local mm Layout Editor
- Safe SVG Logo / Mark Import
- V0.18 Appearance Proof
- V0.19 Appearance Production Export
- V0.19 Cross-panel Artwork

### Customer / Rule / Master

- Customer Profile
- Packaging Rule Builder
- Rule Revision History
- Locked Variables
- Mark Template
- Master Template V2
- Rename / Duplicate / Revision / Restore
- JSON Import / Export
- Workspace Bundle
- Batch 先套 Master 再写入订单变量

### Excel / CSV Batch

- `.xlsx` / `.csv` / `.tsv`
- Multi-sheet
- Auto Mapping + Manual Mapping
- Package `1/3`
- Batch-wide Preflight
- Combined PDF / PDF ZIP
- Job Queue
- Pause / Resume / Cancel
- IndexedDB Persistent Artifact Cache
- Recovered ZIP
- Module Web Worker PDF Generation
- User TTF / ICC Worker Transfer
- V0.19 Appearance-aware Batch PDF Serializer

### Production Approval

- Create Snapshot
- Submit
- Approve
- Reject
- New Revision
- Audit Trail
- Production Fingerprint
- Viewer / Operator / Approver / Admin
- Approved Production PDF Gate

Approved PDF 必须同时满足：Approved Job、0 Preflight Error、Fingerprint 未变化、当前角色拥有导出权限。

### Project Persistence / Remote Merge

- Project Envelope + Revision
- Local Project Library
- JSON Import / Export
- REST Adapter
- `If-Match` Revision Protection
- Remote Base
- Domain Merge
- Object / Field-level Three-way Merge

REST 约定：

```text
GET    /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id
```

当前仓库仍不包含真正托管的 BoxStudio 后端、登录系统或 SSO。

### Production Export

- SVG 1:1 mm
- PNG Preview
- R12 ASCII DXF
- Production PDF
- CUT / CREASE / PERF / GLUE Spot Separation
- Overprint
- Technical Vector Text
- User TTF glyf Outline
- CMYK ICC OutputIntent
- PDF/X-4 Candidate Gate
- SVG Outline Materialization
- V0.19 Vector Appearance Materialization
- V0.19 Cross-panel Clipping

`PDF/X-4 Candidate` 不等同 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 第三方认证。

## 运行

```bash
python -m http.server 8080
```

打开：

```text
http://localhost:8080
```

不要直接使用 `file://`。

## 自动测试

GitHub Actions 当前执行：

```bash
node --check src/*.js
node --check tests/*.mjs
node tests/smoke.mjs
node tests/v10.mjs
node tests/v11.mjs
node tests/v12.mjs
node tests/v13.mjs
node tests/v14.mjs
node tests/v15.mjs
node tests/v16.mjs
node tests/v17.mjs
node tests/v18.mjs
node tests/v19.mjs
```

V0.19 Regression 覆盖：

- Gradient → Vector Production Polygon
- 0%→100% Gradient Percentage Coordinates
- Multiple Gradient Output Colors
- Cross-panel Placement Across Adjacent Panels
- Polygon Fragment Clipping
- Outline Segment Clipping
- Cross-panel Diagnostics
- Raw SVG/Cross-panel Object Materialization
- V0.19 PDF Header / RGB Fill Operators
- Batch Worker V0.19 Serializer

详细报告：

```text
docs/V0.19_TEST_REPORT.md
```

## 数据存储

Browser project state：

```text
boxstudio-mvp-v19
```

V0.18 和更早版本继续作为迁移来源。

附加存储：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## V0.19 关键新增文件

```text
src/
  productionAppearance.js
  crossPanelArtwork.js
  exportV19.js
  v19Ui.js
  v19Ui.css

tests/
  v19.mjs

docs/
  V0.19_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能从源文件确认的字段、Barcode+QR 组合要求、多包裹规则等进入规则层；源文件未提供的完整结构尺寸、设备补偿表和工厂工艺参数不会被伪造为原始规格。

## 下一阶段

- Native SVG/PDF Gradient Objects
- ICC-managed RGB → CMYK Artwork Conversion
- PDF Transparency Group / Alpha / Luminance Mask
- Cross-panel Artwork 直接进入主 2D Canvas 编辑
- Cross-panel Artwork 直接进入 Folded 3D Texture Atlas
- Per-object Z-order / Clip-path Editor
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted BoxStudio Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（只使用已验证生产参数）
