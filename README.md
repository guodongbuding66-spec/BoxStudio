# BoxStudio V0.12

浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、批量订单、3D 折叠、印前检查与生产文件导出原型。

当前主线是把 **参数化纸盒结构 + 唛头变量 + Customer Profile + Packaging Rule + Master Template + Excel 批量生成 + Preflight + 可追溯生产配置** 做成一套可复用工作流。

## V0.12 新增

### Large Batch Queue

V0.12 不再把大批量 PDF 当成一次不可中断的长循环。

新增：

- PDF ZIP Job Queue
- 每行 `pending / running / completed / failed / cancelled`
- 实时进度百分比
- completed / failed / pending 统计
- 行与行之间让出浏览器主线程
- 安全边界取消
- 取消后只打包已经真实生成完成的 partial ZIP
- Preflight Error 行标记为 failed，不伪装成成功文件
- failed / cancelled 队列状态支持重置重跑

注意：队列元数据可进入项目状态，但生成中的 PDF 二进制不会写入 `localStorage`。页面刷新后需要重新开始导出。

### Workspace Bundle

新增可携带的 Workspace Bundle JSON，可一次性导入/导出：

- Custom Customer Profiles
- Custom Packaging Rules
- Packaging Rule revision history
- Custom Mark Templates
- Custom Mark Assets
- Master Templates
- Active Customer / Rule / Mark Template IDs

这样客户模板、工厂规则和 Master 不再只能留在当前浏览器里手工重建。

### Mark Asset Library

新增唛头素材库：

- Built-in `This Side Up`
- Built-in `Fragile`
- Built-in `Keep Dry`
- 当前选中的 mark-layer 元素可以保存为自定义 Asset
- 插入 Asset 时生成新的元素 ID
- Asset 去除原项目专属 x / y / panel 绑定后再复用
- 自定义 Asset 可删除

当前 Asset Library 面向 BoxStudio 已支持的元素类型；还不是任意 SVG 图标编辑器。

### Packaging Rule Version History

自定义 Packaging Rule 现在支持版本历史：

- `revision`
- `revisionNote`
- `createdAt`
- `updatedAt`
- `versions[]`
- 同 ID 再次保存时自动创建新 revision
- Restore 旧版本时生成新的当前 revision，不破坏历史
- Built-in Rule 继续保持只读

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
- 250×80 mm / 200×64 mm 组合规格
- This Side Up / Fragile / Keep Dry
- Custom Mark Template
- Custom Mark Asset Library

### Customer Profile / Packaging Rule

支持：

- 客户默认变量
- 客户锁定变量
- 客户关联 Packaging Rule
- 客户首选 Mark Template
- 自定义必填字段
- 固定变量 `key=value`
- CRN 重复绑定数量
- Package index/count
- Multi-package notice
- Barcode+QR preset / ratio / aspect-lock
- 自定义 Packaging Rule revision history

### Master Template V2

Master Template 保存：

- 结构
- 唛头元素和位置
- Export Options
- Customer Profile ID
- Packaging Rule ID
- Mark Template ID
- Locked variables / groups
- 非订单变量默认值
- 自定义 Profile 快照

支持：

- Rename
- Duplicate
- Save Revision
- Version History
- Restore older revision as a new revision
- JSON Import / Export
- 应用 Master 时保留当前 SKU / 重量 / CRN / Package No. 等实时订单数据

### Excel / CSV Batch

- `.xlsx` / `.csv` / `.tsv`
- 多 Sheet
- 自动字段识别
- 手工字段映射
- Package `1/3` 解析
- 批量 SVG / PDF 基础输出
- Master Template 批量管线
- Batch-wide Preflight
- Master Combined PDF
- Master PDF ZIP
- V0.12 Large Batch PDF Queue

批量 Master 的执行顺序：

1. Clone project state
2. Apply selected Master Template
3. Restore embedded custom profiles
4. Map Excel/CSV row to variables
5. Normalize variables
6. Run Preflight
7. Export only valid/specified output

### 3D

- Panel / Fold Graph
- Hinge-pivot 折叠逻辑
- Fold 0–100%
- Three.js 优先
- CDN 不可用时离线 Canvas fallback

当前还没有声称完整实现生产级“2D 印刷稿自动贴到每个折叠面”的纹理映射。

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

`PDF/X-4 Candidate` 是受约束的候选输出路径，不等于 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方合规认证。

## Preflight

当前检查包括：

- Customer Profile
- Packaging Rule Profile
- Mark Template
- 必填字段
- 固定字段
- Package index/count
- Multi-package notice
- CRN 重复变量绑定
- Barcode + QR 组合 / ratio / preset / aspect lock
- Barcode / GS1 语义
- QR 编码
- Panel 边界
- Safe Area / Bleed
- Fold Graph
- 导入刀版拓扑
- CUT crossing / Polygon self-intersection
- Spot / Overprint
- 文字转曲
- ICC / PDF/X Candidate gate

## 运行

项目是无构建依赖的浏览器 ES Module 应用。

```bash
python -m http.server 8080
```

然后打开：

```text
http://localhost:8080
```

不要直接使用 `file://`，浏览器会限制 ES Module。

## 自动测试

GitHub Actions 当前执行：

```bash
node --check src/*.js
node --check tests/*.mjs
node tests/smoke.mjs
node tests/v10.mjs
node tests/v11.mjs
node tests/v12.mjs
```

V0.12 回归覆盖：

- Job Queue create / claim / complete / fail / cancel / retry
- Mark Asset snapshot / insert / delete
- Packaging Rule revision creation / restore
- Workspace Bundle validate / serialize / parse / merge
- V0.10 / V0.11 既有功能回归

## 数据存储

当前 browser storage key：

```text
boxstudio-mvp-v12
```

V0.11 及更早 key 继续作为迁移来源。

目前仍没有账号数据库 / 云端项目同步。

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
  rules.js
  customerProfiles.js
  markTemplates.js
  markAssets.js
  masterTemplates.js
  profileBundles.js
  profileUi.js
  v11BatchUi.js
  v12Ui.js
  preflight.js
  export.js
  threePreview.js
  ...

tests/
  smoke.mjs
  v10.mjs
  v11.mjs
  v12.mjs

docs/
  V0.10_TEST_REPORT.md
  V0.11_TEST_REPORT.md
  V0.12_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能够从源文件确认的字段、条码二维码组合要求、多包裹文字规则等可以进入规则层；源文件没有提供完整结构尺寸或纸箱厂补偿表的部分，不作为 PDF 原始规格伪造。

## 下一阶段

计划继续推进：

- 大批量队列的真正暂停 / 继续与浏览器 Worker 化
- 云端项目 / Profile / Master 同步
- 更完整的 Mark Library 独立编辑画布
- 工厂 Structural Compensation Profile（仅使用已验证数据）
- 3D 材质与印刷贴图预览
- Production Job / Approval / Audit Log
