# BoxStudio V0.15

浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化纸盒结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Excel 批量生成 + Preflight + Production Approval + Recoverable Artifacts + Project Persistence + SVG Mark + Worker Batch + Remote Merge**。

## V0.15 新增

### SVG Mark / Logo Import

新增安全 SVG 唛头 / Logo 导入：

- `path`
- `line`
- `rect`
- `circle`
- `ellipse`
- `polygon`
- `polyline`
- M/L/H/V/C/Q/A/Z Path Commands
- Bezier / Arc → Vector Segments
- Panel 绑定
- mm 尺寸
- 旋转 / 移动仍复用 Mark Layout 数据模型

导入后以 `svg-symbol` 保存到项目元素中，生产 PDF 前通过 `materializeSvgMarksForProduction()` 转换为 BoxStudio 线对象。

安全策略会拒绝：

- script
- foreignObject
- iframe / object / embed
- image
- use
- 外部 URL / data / javascript href

> V0.15 当前是“安全矢量轮廓”路径，不宣称完整复刻 Illustrator SVG Appearance。复杂填充、渐变、mask、clipPath、blend mode、CSS 与栅格图仍属于后续工作。

### SVG-aware Production PDF

V0.15 新增：

- Draft PDF + SVG Marks
- Approved PDF + SVG Marks

审批版仍必须满足原有 Production Job Gate 和角色权限。

V0.15 会隐藏旧 V0.14 的 Approved PDF 按钮，避免旧导出路径忽略新 `svg-symbol` 对象。

### Web Worker Batch PDF

新增真正的 module Web Worker 批量 PDF 路径：

```text
src/batchWorkerCore.js
src/batchPdf.worker.js
```

每一行订单在 Worker 内完成：

1. Master Template 套用；
2. Excel / CSV 变量映射；
3. Preflight；
4. SVG Mark Materialization；
5. Production PDF；
6. ArrayBuffer Transfer 回主线程。

主线程只负责 Queue、IndexedDB、进度、Pause / Resume / Cancel 和 ZIP。

Worker Queue 继续使用 V0.14 的可恢复 Artifact Store，因此刷新页面后已生成 PDF 仍可 Reconcile / Recover。

Worker 路径目前主动阻止：

- User TTF Outline Mode
- PDF/X Candidate Mode

原因是这些路径可能依赖当前主线程会话中加载的 TTF / ICC 二进制资源。V0.15 不会为了“看似完成”而在 Worker 中静默丢失这些生产资源。

### Remote Conflict Resolver

新增远程项目冲突比较与合并：

- Fetch & Compare
- Remote Base
- local-only
- remote-only
- both-same
- conflict
- Keep Local
- Use Remote
- Apply Merge Locally
- Push Merged Revision

有 Remote Base 时执行保守三方比较；没有 Base 的首次比较会把所有差异视为冲突，不会假设祖先关系。

Push Merged Revision 使用远程当前 Revision 作为父版本，并继续通过 REST Adapter 的 `If-Match` 做并发写保护。

> 当前是“项目域级 Merge”，不是 CRDT / OT 多人实时协同。`elements`、`masterTemplates`、`productionJobs`、`batch` 等数组当前作为原子域处理。

## V0.14 能力继续保留

### Recoverable Batch Artifacts

V0.14 将批量 PDF 二进制写入浏览器 IndexedDB，不再只保存在当前 JSZip 内存会话中。

支持：

- Queue ID + Row Index 持久化
- 页面刷新后恢复已完成文件
- Queue Metadata / Artifact Reconcile
- completed 但文件缺失 → pending
- pending / failed 但文件存在 → completed
- Recovered ZIP
- ZIP Manifest
- Pause / Resume / Cancel 安全行边界

> IndexedDB 仍是浏览器本地存储，不是云端对象存储。

### Production Roles

本地生产角色：

- Viewer
- Operator
- Approver
- Admin

权限同时在 UI 与 `productionJobs.js` 动作层检查。

Operator：Create / Submit / Revise / Export Approved

Approver：Approve / Reject / Export Approved

Admin：全部生产动作，包括 Delete

Viewer：只读

> 当前角色模型不是登录认证、SSO、电子签名或不可篡改审计系统。

### Project Persistence Layer

`src/projectStore.js` 支持 Project Envelope：

- schema / schemaVersion
- project ID
- revision
- parent revision
- createdAt / updatedAt
- updatedBy
- project state snapshot

Local Project Library：

- Save Snapshot
- Revision
- List
- Load
- Delete
- Project JSON Import / Export

REST Adapter：

```text
GET    /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id
```

`PUT` / `DELETE` 可使用 `If-Match` 做 Revision 冲突控制。

> 当前仓库仍不包含真正的 BoxStudio 云端后端。

## 现有核心能力

### 结构 / 刀版

- 参数化 Side-Seal / RSC 基础结构
- Mailer 150010 参考结构
- SVG / DXF / PDF / PDF-compatible AI 矢量刀版导入
- CUT / CREASE / PERF / GLUE 语义
- Bezier / Arc 原生控制点
- Polygon Panel
- Panel / Fold Graph
- CREASE → Fold Candidate 人工确认
- 基础拓扑修复
- CUT Crossing / Polygon Self-intersection 检查
- Bleed / Safe Area

> 工厂压线补偿、刀模板补偿和设备公差必须来自已验证生产数据。BoxStudio 不自动编造这些参数。

### 唛头 / 条码

- SKU、N.W.、G.W.、Package Meas、CRN、Contract No.、Origin、Destination、Package No.
- 多包裹英文提示条件
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR 锁定组合
- 250×80 mm / 200×64 mm
- This Side Up / Fragile / Keep Dry
- Custom Mark Template
- Mark Asset Library
- Panel-local mm Mark Layout Editor
- SVG Mark / Logo Outline Import

### Customer Profile / Packaging Rule

- 客户默认变量 / 锁定变量
- Origin / Destination / INCH / MM / LBS / KG
- Packaging Rule 绑定
- 默认 Mark Template
- 自定义必填字段
- 固定变量 `key=value`
- CRN 重复绑定数量
- Package index/count
- Multi-package notice
- Barcode+QR preset / ratio / aspect lock
- Packaging Rule revision history / restore

### Master Template V2

Master Template 保存结构、唛头元素和位置、Export Options、Customer / Packaging Rule / Mark Template IDs、Locked variables / groups、非订单变量默认值及自定义 Profile 快照。

支持 Rename、Duplicate、Save Revision、Version History、Restore、JSON Import / Export，并可在批量订单中先套 Master 再填 Excel 行变量。

### Excel / CSV Batch

- `.xlsx` / `.csv` / `.tsv`
- 多 Sheet
- 自动字段识别 + 手工映射
- Package `1/3` 解析
- 批量 SVG / PDF 基础输出
- Master Template 批量管线
- Batch-wide Preflight
- Combined PDF / PDF ZIP
- Job Queue
- completed / failed / cancelled / pending
- Pause / Resume
- Persistent PDF Artifact Cache
- Recovered ZIP
- Web Worker PDF Path

### Production Job / Approval / Audit

- Create Snapshot
- Submit
- Approve
- Reject
- New Revision
- Audit Trail
- Production Fingerprint
- Approved Production PDF Gate
- Role Permission Model
- V0.15 SVG-aware Approved PDF

Approved Production PDF 只有在以下条件同时成立时放行：

1. 当前 Production Job 已 Approved；
2. 审批快照没有 Preflight Error；
3. 当前结构、变量、唛头、Profile、Export Options 的 fingerprint 与审批版本一致；
4. 当前角色拥有 `export-approved` 权限。

### Workspace Bundle

可一次性迁移：

- Custom Customer Profiles
- Packaging Rules + revisions
- Mark Templates
- Mark Assets
- Master Templates
- Active Profile IDs

### 3D

- Panel / Fold Graph
- Hinge-pivot 折叠逻辑
- Fold 0–100%
- Three.js 优先
- runtime 不可用时离线 Canvas fallback
- Three.js 路径可将现有文字 / 图标 / Barcode+QR 绘制到矩形 Panel Texture

当前 **还没有**把 V0.15 任意 SVG Mark 的完整外观、复杂印刷稿和 Polygon Panel 全部映射成最终 3D 校样贴图。

### Production Export

- SVG 1:1 mm
- PNG Preview
- R12 ASCII DXF
- Production PDF
- Spot Separation：CUT / CREASE / PERF / GLUE
- Overprint
- Technical Vector Text
- 用户 TTF glyf 转曲
- 用户 CMYK ICC OutputIntent
- PDF/X-4 Candidate Gate
- V0.15 SVG Outline Materialization

`PDF/X-4 Candidate` 是受约束候选输出路径，不等于 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证。

## Preflight

当前检查包括 Customer Profile、Packaging Rule Profile、Mark Template、必填/固定字段、Package index/count、Multi-package notice、CRN 重复绑定、Barcode+QR 组合与比例、Barcode/GS1、QR、Panel/Safe Area/Bleed、Fold Graph、导入刀版拓扑、CUT crossing / Polygon self-intersection、Spot / Overprint、文字转曲、ICC / PDF/X Candidate gate。

V0.15 Worker Core 在进入 PDF 生成前还会额外验证 SVG Mark Schema 和矢量段数据。

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
```

V0.15 回归覆盖：

- SVG Path / Rect / Circle Parsing
- Cubic Bezier Flatten
- Blocked Script / Image
- SVG Symbol → Production Lines
- Rotation / Scaling Materialization
- Worker Eligibility
- Worker Core Production PDF `%PDF-`
- Three-way Local-only / Remote-only Merge
- Explicit Conflict Resolution
- First Compare Without Base → Conflict

## 数据存储

当前 browser project state key：

```text
boxstudio-mvp-v15
```

旧版本 key 继续作为迁移来源。

附加本地存储：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 关键目录

```text
src/
  app.js
  geometry.js
  foldgraph.js
  importDieline.js
  pdfAiImport.js
  repair.js
  barcode.js
  qrcode.js
  batch.js
  batchTemplates.js
  jobQueue.js
  persistentBatch.js
  artifactStore.js
  batchWorkerCore.js
  batchPdf.worker.js
  svgMark.js
  projectMerge.js
  rules.js
  customerProfiles.js
  markTemplates.js
  markAssets.js
  markLayout.js
  masterTemplates.js
  productionJobs.js
  permissions.js
  projectStore.js
  profileBundles.js
  profileUi.js
  v11BatchUi.js
  v12Ui.js
  v13Ui.js
  v14Ui.js
  v15Ui.js
  preflight.js
  export.js
  threePreview.js
  ...

tests/
  smoke.mjs
  v10.mjs
  v11.mjs
  v12.mjs
  v13.mjs
  v14.mjs
  v15.mjs

docs/
  V0.10_TEST_REPORT.md
  V0.11_TEST_REPORT.md
  V0.12_TEST_REPORT.md
  V0.13_TEST_REPORT.md
  V0.14_TEST_REPORT.md
  V0.15_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能够从源文件确认的字段、条码二维码组合要求、多包裹文字规则等可以进入规则层；源文件没有提供完整结构尺寸或纸箱厂补偿表的部分，不作为 PDF 原始规格伪造。

## 下一阶段

- 正式 BoxStudio 后端与账号认证
- Server-side Immutable Audit / Approval Signatures
- 云端 Resumable Artifact / Object Storage
- SVG Fill / Gradient / Clip / Mask 更完整生产渲染
- Worker Transfer User TTF / ICC Registries
- 更细粒度 Object-level Remote Merge
- 更完整 3D Print-artwork Texture Mapping
- Factory Compensation Profiles（只接受已验证生产参数）
