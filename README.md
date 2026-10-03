# BoxStudio V0.17

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof**。

## V0.17 新增

### 1. Folded Artwork Texture Proof

V0.16 的 `Panel Artwork Texture Atlas` 现在已经真正进入折叠 3D 预览链路。

新增：

- `src/threeArtworkProof.js`
- `src/v17Ui.js`
- `src/v17Ui.css`

统一 Artwork Atlas 中的内容会先按 Panel 渲染成局部纹理，再映射到折叠后的 Panel 表面，包括：

- Text / Package Notice
- Shipping Icons
- Line / Shape
- Barcode + QR
- Imported SVG Symbol

V0.17 的 Texture Proof 支持：

- Fold 0–100%
- Pointer Drag Orbit
- Mouse-wheel Zoom
- Rebuild Artwork Textures
- Reset View
- Depth-sorted Panel Rendering
- Panel Boundary Wireframe

这一条 3D 预览使用 Canvas 2D 三角纹理映射实现，不依赖额外 Three.js bundle，因此在没有 Three.js runtime 时也可以显示真正的 Panel Artwork Texture。

> 这仍是结构与印刷位置核对预览，不等同印厂 RIP 色彩软打样，也不模拟纸板弯曲半径、印刷拉伸、网点、陷印或基材光学属性。

### 2. Polygon Panel UV Mapping

V0.17 新增 Simple Polygon Ear-clipping Triangulation。

每个 Panel 会执行：

1. 取得 Panel Polygon；
2. 生成 Panel-local UV；
3. Polygon Triangulation；
4. 将纹理三角形仿射映射到折叠后的屏幕三角形。

矩形 Panel 使用 2 个 UV Triangle。

简单凹多边形会通过 Ear Clipping 处理；如果遇到无法可靠三角化的异常几何，会显式退回 Fan Triangulation，并在 V0.17 UI 中显示警告，不会把异常几何隐藏起来。

### 3. Fold Seam UV Diagnostics

每条 Fold Graph Edge 都会生成 UV / Hinge Diagnostics：

- From Panel
- To Panel
- Fold Label
- Hinge Length
- From UV Endpoints
- To UV Endpoints
- Fallback Hinge Status
- mapped / warning

检查目标是确认同一折线端点能够进入两个连接 Panel 的纹理坐标域。

这不等于“自动把一张跨面图片无缝延续到多个 Panel”。Cross-panel Artwork Continuity 仍然属于后续独立功能。

## V0.16 能力继续保留

### Worker TTF / ICC Binary Transfer

- Worker 启动时一次性传输当前用户 TTF / ICC binary
- Worker 内重新建立 Font / ICC Registry
- User TTF Outline 可进入 Worker
- PDF/X Candidate 有 ICC 时可进入 Worker
- 缺少必要资源时明确阻止，不静默降级
- 主线程继续负责 Queue、Pause / Resume / Cancel、IndexedDB Artifact 与 Recovered ZIP

### Object-Level Remote Merge

高冲突域继续使用对象/字段级三方合并：

- `elements`：`id + field`
- `masterTemplates`：`id + field`
- `productionJobs`：`id + field`
- Custom Customer / Packaging Rule / Mark Template / Mark Asset：`key + field`

不同字段的 Local / Remote 修改可自动合并；同字段不同结果才要求 `Keep Local` 或 `Use Remote`。

当前仍不是 CRDT / OT 实时多人协同系统。

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
- Safe SVG Logo / Mark Outline Import

SVG 目前仍是安全矢量轮廓子集，不等同完整 Illustrator Appearance。Fill / Gradient / Clip / Mask / CSS / Raster fidelity 仍未完成。

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

### 3D

- Panel / Fold Graph
- Hinge-pivot Fold 0–100%
- Existing Three.js Path
- Existing Offline Canvas Fallback
- Panel Artwork Texture Atlas
- V0.17 Folded Artwork Texture Proof
- Rectangular UV Mapping
- Polygon Ear-clipping UV Triangulation
- Fold Seam UV Diagnostics

当前仍不宣称具备 ICC-aware Display Conversion、印刷形变模拟或 RIP 级 Soft Proof。

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
```

V0.17 回归覆盖：

- Concave Polygon Ear-clipping
- Rect Panel UV Generation
- UV Bounds
- Default RSC Fold Hinge UV Mapping
- Folded Artwork Proof Model
- Artwork Command Presence
- UV Triangle Count
- Fold 0% / 100% Transform Change

详细报告：`docs/V0.17_TEST_REPORT.md`。

## 数据存储

Browser project state：

```text
boxstudio-mvp-v17
```

V0.16 和更早版本继续作为迁移来源。

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
  panelArtwork.js
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
  v14Ui.js
  v15Ui.js
  v16Ui.js
  v17Ui.js
  ...

tests/
  smoke.mjs
  v10.mjs ... v17.mjs

docs/
  V0.10_TEST_REPORT.md ... V0.17_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能从源文件确认的字段、Barcode+QR 组合要求、多包裹规则等进入规则层；源文件未提供的完整结构尺寸、设备补偿表和工厂工艺参数不会被伪造为原始规格。

## 下一阶段

- SVG Solid Fill / Gradient / Clip / Mask Production Rendering
- Cross-panel Artwork Continuity / Bleed across folds
- ICC-aware Display Conversion for 3D Preview
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted BoxStudio Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Per-object Ordering / Collaborative Merge
- Factory Compensation Profiles（仅使用已验证生产参数）
