# BoxStudio V0.14

浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化纸盒结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Excel 批量生成 + Preflight + Production Approval + Recoverable Artifacts + Project Persistence**。

## V0.14 新增

### Recoverable Batch Artifacts

V0.14 将批量 PDF 二进制写入浏览器 IndexedDB，不再只保存在当前 JSZip 内存会话中。

现在支持：

- 按 Queue ID + Row Index 持久化 PDF
- 页面刷新后恢复已完成文件
- Queue Metadata 与 IndexedDB Artifact 自动 reconcile
- completed 但文件缺失 → 自动退回 pending
- pending / failed 但存在真实文件 → 可恢复为 completed
- Recovered ZIP
- ZIP 内附 `boxstudio-artifacts.json` manifest
- Pause / Resume / Cancel 继续保留安全行边界语义

> IndexedDB 仍是浏览器本地存储，不是云端对象存储；清除站点数据仍会删除这些二进制文件。

### Production Roles

新增本地生产角色：

- Viewer
- Operator
- Approver
- Admin

权限不是只在按钮上隐藏，而是在 `productionJobs.js` 动作函数层再次校验。

Operator：Create / Submit / Revise / Export Approved

Approver：Approve / Reject / Export Approved

Admin：全部生产动作，包括 Delete

Viewer：只读

> 当前角色模型不是登录认证、SSO、电子签名或不可篡改审计系统。

### Project Persistence Layer

新增 `src/projectStore.js`。

项目可保存为带版本信息的 Project Envelope：

- schema / schemaVersion
- project ID
- revision
- parent revision
- createdAt / updatedAt
- updatedBy
- project state snapshot

新增浏览器 Local Project Library：

- Save Snapshot
- Revision
- List
- Load
- Delete
- Project JSON Import / Export

同时加入未来服务端对接用 REST Adapter，约定：

```text
GET    /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id
```

`PUT` / `DELETE` 可使用 `If-Match` 做 revision 冲突控制。

> 当前 GitHub 仓库不包含真正的 BoxStudio 云端后端。REST UI 只有在你提供兼容、允许 CORS 的服务端地址时才会工作。

### V0.14 Persistent Production Workspace

Profile 面板新增：

- Persistent Batch Artifacts
- Production Roles & Approval
- Project Persistence

V0.14 会隐藏旧 V0.12 Queue 控件和旧 V0.13 Production 控件，避免同一工作流出现两套入口。底层旧模块仍保留用于迁移和回归测试。

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
- CUT crossing / Polygon self-intersection 检查
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

### Production Job / Approval / Audit

- Create Snapshot
- Submit
- Approve
- Reject
- New Revision
- Audit Trail
- Production Fingerprint
- Approved Production PDF Gate
- V0.14 Role Permission Model

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
- Three.js 路径可将 BoxStudio 已支持的文字 / 图标 / Barcode+QR 绘制到矩形 Panel texture

当前不宣称任意复杂印刷稿、Polygon Panel 与离线 fallback 已达到完整包装贴图校样精度。

### Production Export

- SVG 1:1 mm
- PNG preview
- R12 ASCII DXF
- Production PDF
- Spot Separation：CUT / CREASE / PERF / GLUE
- Overprint
- Technical vector text
- 用户 TTF glyf 转曲
- 用户 CMYK ICC OutputIntent
- PDF/X-4 Candidate gate

`PDF/X-4 Candidate` 是受约束候选输出路径，不等于 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证。

## Preflight

当前检查包括 Customer Profile、Packaging Rule Profile、Mark Template、必填/固定字段、Package index/count、Multi-package notice、CRN 重复绑定、Barcode+QR 组合与比例、Barcode/GS1、QR、Panel/Safe Area/Bleed、Fold Graph、导入刀版拓扑、CUT crossing / Polygon self-intersection、Spot / Overprint、文字转曲、ICC / PDF/X Candidate gate。

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
```

V0.14 回归覆盖：

- Role allow / deny
- Operator 不能 Approve
- Approver 可以 Approve
- Admin-only Delete
- Project Envelope / Revision / Import / Export
- Local Project Library
- REST Adapter / If-Match
- Artifact Store
- Queue / Artifact Reconciliation
- Persistent Queue Progress
- Artifact Cleanup

## 数据存储

当前 browser project state key：

```text
boxstudio-mvp-v14
```

旧版本 key 继续作为迁移来源。

附加本地存储：

```text
boxstudio-project-library-v1
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

docs/
  V0.10_TEST_REPORT.md
  V0.11_TEST_REPORT.md
  V0.12_TEST_REPORT.md
  V0.13_TEST_REPORT.md
  V0.14_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能够从源文件确认的字段、条码二维码组合要求、多包裹文字规则等可以进入规则层；源文件没有提供完整结构尺寸或纸箱厂补偿表的部分，不作为 PDF 原始规格伪造。

## 下一阶段

- 正式 BoxStudio 后端与账号认证
- server-side immutable audit / approval signatures
- Web Worker PDF generation
- 云端 resumable artifact/object storage
- concurrent project conflict-resolution UI
- general SVG mark symbol import/editor
- 更完整的 3D print-artwork texture mapping
- factory compensation profiles（只接受已验证生产参数）
