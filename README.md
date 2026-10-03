# BoxStudio V0.16

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Panel Artwork Texture Atlas**。

## V0.16 新增

### 1. Worker TTF / ICC Binary Transfer

V0.15 的 PDF Worker 会主动阻止依赖会话二进制资源的输出。V0.16 补上了这条生产链：

- `src/workerAssets.js`
- `fontRegistry.js` 保留用户上传 TTF 的原始 bytes
- `iccRegistry.js` 暴露当前 ICC 原始 bytes
- Worker 启动时一次性传输 TTF / ICC
- Worker 内重新建立字体 / ICC Registry
- 同一个 Worker 后续批量订单复用这些 Registry

现在：

- Technical Vector Text → 可直接走 Worker
- User TTF Outline → 有 TTF binary 才允许 Worker
- PDF/X Candidate → 有 ICC binary 才允许 Worker
- 缺少生产资源 → 明确阻止，不静默降级

主线程仍负责 Queue、Pause / Resume / Cancel、IndexedDB Artifact、Recovered ZIP 和 UI。

### 2. Object-Level Remote Merge

新增 `src/projectMergeV2.js`。

以下高冲突域不再整块覆盖：

- `elements`：按 `id` + field 合并
- `masterTemplates`：按 `id` + field 合并
- `productionJobs`：按 `id` + field 合并
- Custom Customer / Packaging Rule / Mark Template / Mark Asset：按 key + field 合并

例如同一个 `sku` 元素：

```text
Local  修改 x
Remote 修改 y
```

可以自动合并。

如果双方都修改：

```text
elements[sku].x
```

且结果不同，则生成字段级冲突，必须明确选择 `Keep Local` 或 `Use Remote`。

删除/新增冲突也会显式报告。

其余 Structure、Variables、Export Options、Batch 等域仍采用保守原子三方比较。当前不是 CRDT / OT 实时协同系统。

### 3. Panel Artwork Texture Atlas

新增 `src/panelArtwork.js`，把不同唛头元素归一成 Panel-local artwork commands：

- Text / Package Notice
- Shipping Icons
- Line / Shape
- Barcode + QR
- Imported SVG Symbol

V0.16 Workspace 可直接查看每个 Panel 的 Canvas Texture Preview，并统计：

- Panel Count
- Artwork Element Count
- Texture Command Count
- Out-of-panel Commands

这套 Atlas 是后续 Folded 3D 材质与 UV Mapping 的统一数据源基础。

> V0.16 仍不宣称现有折叠 3D 已达到印厂级 UV Soft Proof。Polygon UV、接缝连续性、色彩管理与印刷形变模拟仍需继续开发。

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
- V0.16 User TTF / ICC Worker Transfer

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
- V0.15 Domain Merge
- V0.16 Object / Field-level Merge

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
- Three.js Path
- Offline Canvas Fallback
- 矩形 Panel 基础 Texture
- V0.16 Panel Artwork Texture Atlas

当前不宣称 Polygon UV、复杂 SVG Appearance、色彩管理和印刷变形模拟已经完成。

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
```

V0.16 回归覆盖 TTF/ICC Worker Asset Eligibility、ICC transferable payload、Object-level Merge、field conflict resolution、Custom Profile field merge、SVG artwork commands、Barcode/QR texture commands、Panel bounds 与 Artwork Atlas。

详细报告：`docs/V0.16_TEST_REPORT.md`。

## 数据存储

Browser project state：

```text
boxstudio-mvp-v16
```

旧版本 key 继续作为迁移来源。

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
  ...

tests/
  smoke.mjs
  v10.mjs ... v16.mjs

docs/
  V0.10_TEST_REPORT.md ... V0.16_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能从源文件确认的字段、Barcode+QR 组合要求、多包裹规则等进入规则层；源文件未提供的完整结构尺寸、设备补偿表和工厂工艺参数不会被伪造为原始规格。

## 下一阶段

- Hosted BoxStudio Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- SVG Fill / Gradient / Clip / Mask Production Rendering
- Per-object Ordering / Collaborative Merge
- Panel Artwork Atlas → Folded 3D Material Integration
- Polygon UV / Seam Continuity / Color-managed 3D Soft Proof
- Factory Compensation Profiles（仅使用已验证生产参数）
