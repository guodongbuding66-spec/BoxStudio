# BoxStudio V0.18

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof + SVG Appearance / Fold Bleed Diagnostics**。

## V0.18 新增

### 1. SVG Appearance Safe Subset

新增 `src/svgAppearance.js`，安全 SVG Mark 不再只有黑色轮廓预览。

V0.18 的 Panel Texture / Folded 3D Proof 已支持以下显式 SVG 外观：

- Solid Fill
- Linear Gradient
- Radial Gradient
- 基础 `clipPath`
- 基础几何 Mask（当前按 binary mask 处理）
- `opacity` / `fill-opacity`
- Group / Element Transform
- Rect / Polygon / Circle / Ellipse
- 简单 M/L/H/V/Z Closed Path Fill

现有安全边界继续保留：`script`、`foreignObject`、`iframe`、`object`、`embed`、`image`、`use`、外部 URL、data/javascript 引用均不进入安全 SVG Mark。

V0.18 不伪装成完整 Illustrator Appearance：

- `<style>` CSS selector 不解析；
- Complex Curved Filled Path 仍按 outline 路线处理并给出 warning；
- `gradientTransform` 尚未完整实现；
- Mask 不是完整 alpha/luminance SVG Mask；
- Filter / Pattern / Blend Mode / Raster Image 尚未实现；
- Production SVG/PDF 仍采用原有 outline-safe materialization，不宣称填充外观已经完整进入生产 PDF。

### 2. Appearance → Panel Texture → Folded 3D

`src/panelArtwork.js` 新增 `svg-appearance` command。

现在安全 SVG 的显式 Fill / Gradient / Clip / Mask 会进入统一 Panel Artwork Atlas，然后继续进入 V0.17 建立的 Folded Artwork Texture Proof。

`buildArtworkAtlas()` 还会统计：

- Appearance Commands
- Panel Commands
- Out-of-panel Commands

这使 SVG 外观不再只是孤立的 2D 导入信息，而是进入同一 3D 包装校样链路。

### 3. Fold Bleed Continuity Diagnostics

新增 `src/bleedContinuity.js`。

BoxStudio 会针对每条 Fold Graph Edge 检查折线两侧的 Artwork Band。默认 Band 使用当前结构的 Bleed mm。

状态分为：

- `two-sided`：折线两侧都有 artwork；
- `one-sided`：只有一侧有 artwork，需要人工检查；
- `empty`：折线附近没有 artwork；
- `missing`：Panel / Hinge 几何缺失。

这是一套生产检查工具，不会把“看起来接近折线”错误地当作已经自动跨面连续。真正的 Cross-panel Artwork Object / Automatic Panel Clipping 仍属于后续开发。

### 4. V0.18 Proof Workspace

新增：

- `src/v18Ui.js`
- `src/v18Ui.css`

界面现在集中显示：

- Folded 3D Artwork Texture Proof
- SVG Fill Primitive Count
- Gradient / Clip / Mask Count
- SVG Appearance Warnings
- Fold Bleed Continuity Table
- Output ICC Metadata
- Fold 0–100%
- Orbit / Zoom / Reset / Rebuild Proof

V0.18 启用后会隐藏旧的 V0.17 重复 Proof 面板。

### 5. Display Color Pipeline Boundary

如果当前页面已加载用户 ICC，V0.18 会显示：

- Profile Name
- Color Space
- PCS
- ICC Version

但当前 Folded Proof 仍通过浏览器 Canvas / sRGB 显示。

**V0.18 不宣称已经完成 ICC Device → PCS → Monitor 的真实色彩转换，也不宣称 monitor-calibrated soft proof。**

## V0.17 / V0.16 能力继续保留

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

### Worker TTF / ICC Binary Transfer

- Worker 启动时一次性传输当前用户 TTF / ICC binary
- User TTF Outline 可进入 Worker
- PDF/X Candidate 有 ICC 时可进入 Worker
- 缺少必要资源时明确阻止，不静默降级
- Queue / Pause / Resume / Cancel / IndexedDB Artifact / Recovered ZIP

### Object-Level Remote Merge

高冲突域使用对象/字段级三方合并：

- `elements`: `id + field`
- `masterTemplates`: `id + field`
- `productionJobs`: `id + field`
- Custom Customer / Packaging Rule / Mark Template / Mark Asset: `key + field`

当前不是 CRDT / OT 实时多人协同系统。

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
- V0.18 Safe SVG Appearance Proof Subset

### Customer / Rule / Master

- Customer Profile
- Packaging Rule Builder
- Rule Revision History
- Locked Variables
- Mark Template
- Master Template V2
- Rename / Duplicate / Revision / Restore
- JSON Import / Export
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
- Object / Field-level Merge

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

`PDF/X-4 Candidate` 不等同 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证。

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
```

V0.18 回归覆盖：

- Solid Fill Parsing
- Linear Gradient + Stops
- clipPath
- Binary Mask Geometry
- SVG Mark Appearance Retention
- Panel Artwork `svg-appearance` Command
- Appearance Command Count
- Quadratic Path Endpoint Regression
- One-sided Fold Artwork Detection
- Two-sided Fold Artwork Detection
- Bleed Continuity Summary

详细报告：`docs/V0.18_TEST_REPORT.md`。

## 数据存储

Browser project state：

```text
boxstudio-mvp-v18
```

V0.17 和更早版本继续作为迁移来源。

附加存储：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 关键目录

```text
src/
  geometry.js
  foldgraph.js
  importDieline.js
  pdfAiImport.js
  barcode.js
  qrcode.js
  svgMark.js
  svgAppearance.js
  panelArtwork.js
  bleedContinuity.js
  threeArtworkProof.js
  batch.js
  batchTemplates.js
  batchWorkerCore.js
  batchPdf.worker.js
  workerAssets.js
  artifactStore.js
  persistentBatch.js
  projectStore.js
  projectMerge.js
  projectMergeV2.js
  productionJobs.js
  permissions.js
  rules.js
  masterTemplates.js
  preflight.js
  export.js
  threePreview.js
  v17Ui.js
  v18Ui.js
  ...

tests/
  smoke.mjs
  v10.mjs ... v18.mjs

docs/
  V0.10_TEST_REPORT.md ... V0.18_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能从源文件确认的字段、Barcode+QR 组合要求、多包裹规则等进入规则层；源文件未提供的完整结构尺寸、设备补偿表和工厂工艺参数不会被伪造为原始规格。

## 下一阶段

- Filled SVG Appearance → Production SVG/PDF
- Full Curved Filled Path Geometry
- gradientTransform / CSS Cascade / Real Alpha Mask
- Explicit Cross-panel Artwork Objects + Automatic Panel Clipping
- True ICC Display Conversion for 3D Proof
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted BoxStudio Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（仅使用已验证生产参数）
