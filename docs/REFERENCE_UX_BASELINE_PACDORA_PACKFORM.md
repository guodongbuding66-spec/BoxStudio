# BoxStudio 参考产品 UX 基准：Pacdora + Packform

**日期**：2026-10-05  
**状态**：当前产品/UI/交互开发参考基准  
**原始目标**：参考 Pacdora 与 Packform 的成熟包装设计工作流，建设一个所有人都能免费使用的纸盒设计网站，并强化 BoxStudio 独有的唛头编辑能力。

> 本文要求学习和借鉴成熟交互模式、信息架构和工作流，不复制第三方品牌资产、文案、图标版权素材或逐像素克隆视觉稿。

---

## 1. 产品原则

1. **所有核心功能免费开放**：不设置模板付费墙、导出付费墙、水印移除付费墙、专业工具付费墙。
2. **不做审核门槛作为默认工作流**：创建、编辑、3D、Preflight、PDF/SVG/DXF 导出均可直接使用。
3. **登录不是使用前提**：默认本地项目即可完成完整设计；登录/云同步属于可选增强。
4. **专业能力不隐藏**：尺寸模式、纸厚、材料、刀版 CAD、唛头、条码/二维码、2D/3D、生产导出都在主工作流可发现。
5. **一个项目、一份结构数据**：结构、Panel、Fold、Artwork、Marks、3D 与生产导出必须来自同一数据链。

---

## 2. 两个参考产品的分工

### Pacdora 更值得学习的部分

- 大规模模板发现与分类；
- 从模板详情页直接进入参数化生成器；
- 制造尺寸 / 内尺寸 / 外尺寸的明确展示；
- 材料可视化选择；
- 2D 刀版 + 3D 模型同步；
- 展开/闭合滑杆；
- AI / PDF / DXF 等生产格式直接可见；
- Select / Hand / Zoom 等 CAD 式底部工具条；
- 模板 → 在线设计 → Mockup/3D 的低门槛流程；
- Barcode / QR 作为包装设计的一等工具。

### Packform 更值得学习的部分

- 专业桌面应用式编辑器布局；
- 顶部全局动作栏；
- 左侧竖向工具 Rail；
- 左侧结构参数面板；
- 中央 2D 刀版画布；
- 右侧 3D Preview / Inspector；
- W/H/D + R + flap 参数实时驱动结构；
- Material / Thickness / Bend Radius 联动；
- 单面 / 多面 / 整版工作模式；
- 面感知的正/背/侧/顶/底切换；
- Inspector 中精确 X/Y/W/H/Rotation；
- Inspector 可折叠、可调整宽度；
- 2D/3D 实时同步与装配演示。

---

## 3. BoxStudio 最终 UI 架构

采用“Pacdora 的模板发现 + Packform 的专业编辑器骨架”。

### 3.1 首页 / Template Center

```text
┌──────────────────────────────────────────────────────────┐
│ BoxStudio      模板   我的项目   导入刀版        新建项目 │
├──────────────────────────────────────────────────────────┤
│ 搜索：盒型 / FEFCO / ECMA / Model ID / 用途             │
│ 分类：折叠盒 / Mailer / 运输箱 / 展示盒 / 天地盖 / ... │
├──────────────────────────────────────────────────────────┤
│ 模板卡片网格：缩略图 + 名称 + 标准 + 材料 + 参数范围    │
└──────────────────────────────────────────────────────────┘
```

借鉴 Pacdora：
- 分类标签横向可滚动；
- 模板缩略图优先视觉识别；
- 支持自然语言搜索；
- 支持 Model ID、FEFCO、ECMA 精确检索；
- 最近使用与收藏直接进入。

### 3.2 模板详情 / Dieline Generator

页面结构：

```text
Header: 返回 / 模板名 / 保存 / 在线设计 / 导出

Left / Center:              Right:
2D 刀版 + 3D Preview        尺寸与材料
                            制造尺寸
                            内尺寸
                            外尺寸
                            材料 / 楞型 / 厚度
                            展开 ↔ 闭合
                            PDF / SVG / DXF / AI*
```

*AI 导出属于目标能力；在实现前必须明确“未支持”，不能伪装按钮。

底部 CAD 工具：
- V Select；
- H Hand/Pan；
- Zoom + / -；
- Fit；
- Cut/Crease/Perf 显示；
- Grid / Ruler；
- Settings。

---

## 4. 主编辑器布局

BoxStudio 主编辑器采用 Packform 式四区结构：

```text
┌───────────────────────────────────────────────────────────────────┐
│ Logo  项目名  Undo Redo  保存状态           2D/3D/Split  导出    │
├──────┬────────────────┬───────────────────────────────┬───────────┤
│ TOOL │ 左侧模式面板   │       2D 主画布              │ 3D/属性   │
│ RAIL │                │                               │ Inspector │
│      │                │                               │           │
├──────┴────────────────┴───────────────────────────────┴───────────┤
│ Zoom / Panel / Grid / Ruler / Snap / Preflight / Status           │
└───────────────────────────────────────────────────────────────────┘
```

### 4.1 顶栏

固定保留：
- Project Switcher / 项目名；
- Undo / Redo；
- 保存状态：已保存 / 有未保存修改；
- 2D / 3D / Split；
- Preflight 状态；
- Export。

不在顶栏放：审批、角色、付费、升级会员。

### 4.2 左侧 Tool Rail

建议顺序：

```text
Structure
Select
Text
Image
Shape
Line
Marks
Barcode
QR
Symbols
Layers
Dieline CAD
Assets
3D
```

一次只激活一个主模式；点击后展开左侧 Mode Panel。

### 4.3 左侧 Mode Panel

#### Structure 模式
- Template；
- W / H / D；
- Inner / Outer / Manufacturing；
- Material；
- Flute；
- Thickness；
- Bend Radius；
- R；
- flap/taper/relief/notch/shoulder 等盒型专属参数。

数值输入必须支持：
- 键盘输入；
- 上下步进；
- 拖动调整；
- mm 单位；
- 改动实时刷新刀版和 3D。

#### Artwork 模式
- Text / Image / Shape；
- 面选择；
- 单面 / 多面 / 整版；
- face fill；
- assets。

#### Marks 模式
BoxStudio 的差异化主面板：
- SKU；
- N.W.；
- G.W.；
- MEAS；
- CRN；
- Contract No.；
- Origin；
- Destination；
- Package X / Total；
- Barcode；
- QR；
- Handling Icons；
- Variable Picker；
- Excel/CSV Batch。

所有组件直接拖到对应 Panel，无审核步骤。

---

## 5. 中央 2D Canvas

必须有三层模式：

```text
Single Face
Multi Face
Full Dieline
```

交互：
- 鼠标滚轮 Zoom；
- Space/H Hand Pan；
- V Select；
- 框选；
- Shift 多选；
- Ctrl/Cmd+C/V；
- Delete；
- Arrow 微移；
- Shift+Arrow 大步移动；
- Alt/Option 拖动复制；
- 对齐辅助线；
- 吸附提示；
- 标尺拉参考线；
- 双击文字进入文本编辑；
- 双击 Panel 进入 Single Face Focus。

画布必须区分：
- CUT；
- CREASE；
- PERF；
- GLUE；
- BLEED；
- SAFE；
- PANEL boundary。

视觉上技术线条弱于 Artwork，但在 CAD 模式自动提升权重。

---

## 6. Inspector

选中任何对象后统一显示：

```text
Name
Panel
X mm
Y mm
W mm
H mm
Rotation °
Opacity
Lock aspect
Layer
```

文字额外：
- Font；
- Size；
- Weight；
- Align；
- Line height；
- Tracking；
- Variable binding。

图片额外：
- Crop / Fit / Fill；
- DPI；
- Original px；
- Replace；
- Image Preflight。

Barcode/QR 额外：
- Symbology；
- Value；
- Quiet Zone；
- Module size；
- Vector status；
- Decode status。

Inspector 必须可折叠、可拖宽。

---

## 7. 3D Panel

采用 Packform 的常驻右侧 3D + Pacdora 的展开/闭合体验。

基础：
- Free View；
- Front/Back/Left/Right/Top/Bottom；
- Orbit / Zoom / Pan；
- Ground orientation；
- Ground distance；
- Fold 0–100%；
- Assembly animation；
- Material；
- Thickness；
- Per-face colors；
- 2D 点击 → 3D 高亮；
- 3D 点击 → 2D Panel Focus。

显示模式：
- Draft；
- HD；
- High Contrast Structure。

不做付费的“高清解锁”；HD 也是免费能力。

---

## 8. Dieline CAD

入口必须在 Tool Rail，不再藏在高级菜单。

工具：
- Node Select；
- Add Node；
- Delete Node；
- Line；
- Arc；
- Cubic Bézier；
- Cut ↔ Crease ↔ Perf ↔ Glue；
- Split Edge；
- Join Edge；
- Offset；
- Slot / Notch / Tab；
- Dimension / Constraint。

CAD 模式画布底栏显示：
- 当前单位；
- Snap；
- Grid；
- Tolerance；
- Selected Node/Edge；
- Geometry warnings。

---

## 9. 唛头编辑体验

### 9.1 一键插入结构化组件

组件库采用可视卡片，而不是纯文本按钮。

示例：

```text
[ SKU ] [ N.W./G.W. ] [ MEAS ] [ CRN ]
[ ORIGIN ] [ PACKAGE X/Y ] [ BARCODE+QR ]
[ THIS SIDE UP ] [ KEEP DRY ] [ FRAGILE ]
```

拖入后即为真实变量组件。

### 9.2 Barcode + QR

- 默认组合组；
- 不可意外拆散；
- 支持标准尺寸 preset；
- 组缩放；
- Barcode / QR 分别可编辑 value；
- 生产文件必须保持 vector。

### 9.3 批量唛头

工作流：

```text
Import Excel/CSV
→ Map Columns
→ Preview first row
→ Validate missing fields
→ Generate N records
→ Batch PDF / ZIP
```

此能力免费开放。

---

## 10. Template Center 交互逻辑

结合 Pacdora 的模板发现方式：

1. 首页先搜索/分类，不先要求创建空项目；
2. 模板卡片 hover：快速预览 3D、主要参数范围；
3. 点击模板进入 Detail，不立即进入复杂 Editor；
4. Detail 页先完成尺寸/材料；
5. 用户可以直接下载刀版，也可以点击“在线设计”；
6. 在线设计进入完整 Editor 并继承所有结构参数。

这样新手路径短，专业用户也不会被隐藏参数限制。

---

## 11. Export UX

右上角固定 Export。

一级选项：

```text
Production PDF
Artwork PDF
Dieline PDF
SVG
DXF
PNG/JPG
3D PNG
GLB
Batch Export
```

生产导出前自动运行 Preflight；有 error 才阻断，不要求审批。

**免费原则**：
- 不加水印；
- 不锁格式；
- 不限制分辨率作为付费手段；
- 不要求 Approver；
- 不要求企业角色。

---

## 12. Preflight UX

Preflight 是“质量检查”，不是“审批”。

三层状态：
- PASS；
- WARNING；
- ERROR。

点击问题：
- 自动定位到 Panel；
- 自动选中对象或刀版元素；
- 提供具体修复入口。

例如：
- Missing CRN → 打开 Marks → CRN；
- Image DPI low → 选中图片；
- Barcode quiet zone → 打开 Barcode Inspector；
- Open CUT endpoint → 进入 CAD 并选中节点。

---

## 13. UI 视觉原则

整体借鉴成熟工具的信息密度，但形成 BoxStudio 自己的视觉系统：

- 深色工具框架 + 浅色画布；
- 左右面板背景略深于 Canvas；
- active 使用单一强调色；
- 技术线颜色保持稳定语义；
- 图标统一 16/20px 系列；
- 圆角克制；
- 少渐变；
- 少“大卡片式后台”；
- Tooltips 必须显示快捷键；
- 重要数值均显式显示单位；
- 状态通过小型 badge/toast，不用大型弹窗阻断。

---

## 14. V0.40 重新定义

V0.40 不再叫“审核/Production Review”，重新定义为：

> **V0.40 — Pacdora/Packform UX Convergence + Free Professional Workflow**

必须优先完成：

1. Editor Shell 重排为 Topbar + Tool Rail + Left Mode Panel + Canvas + Right 3D/Inspector；
2. Template Detail / Dieline Generator 页面；
3. Manufacturing / Inner / Outer 尺寸三层展示；
4. Structure 参数拖动 + 数值输入双模式；
5. Single Face / Multi Face / Full Dieline；
6. 常驻 3D Preview + Fold slider；
7. Inspector 可折叠/可调宽；
8. Export 菜单统一；
9. Marks 组件库视觉重做；
10. Preflight 改为直接修复导向，不做审核；
11. 全部核心功能去除 paywall / role gate；
12. 继续完成真实 Polygon/Bézier Bleed/Safe Offset。

---

## 15. 验收标准

V0.40 不以“多了几个按钮”验收，而以完整用户路径验收：

### 新手路径
```text
Template Center
→ 搜索 Mailer 150010
→ Detail
→ 修改尺寸/材料
→ 查看 2D+3D
→ Online Design
→ 加 Logo/Text
→ 加唛头/Barcode/QR
→ Preflight
→ 免费 Production PDF/DXF
```

### 专业路径
```text
Import DXF/SVG
→ Dieline CAD 修结构
→ Rebuild Topology
→ Full Dieline / Panel Focus
→ Artwork + Marks
→ 2D/3D linked review
→ Preflight locate/fix
→ Production PDF/SVG/DXF
```

### 免费能力检查
任何未登录普通用户都不应因为以下原因被阻断：
- premium；
- subscription；
- watermark；
- approver；
- role；
- export quota。

仅当浏览器存储、文件权限、格式本身或真实 Preflight ERROR 不允许时才阻断操作。
