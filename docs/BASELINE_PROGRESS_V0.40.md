# BoxStudio V0.40 — Free Professional Editor UX Convergence

**日期**：2026-10-05  
**产品基准**：Pacdora + Packform UX reference baseline  
**版本目标**：把 V0.33–V0.39 已有专业能力重新组织成一个更接近成熟包装设计软件的统一工作区，同时明确所有核心设计能力免费开放。

---

## 1. 产品策略

V0.40 起默认用户路径明确为：

```text
Template / Structure
→ 2D Design
→ Marks
→ 2D ↔ 3D
→ Dieline CAD
→ Preflight
→ Export
```

默认路径不要求：

- 付费订阅；
- Premium 解锁；
- 水印移除费用；
- 导出次数配额；
- Operator / Approver 角色；
- Submit / Approve 工作流；
- 登录后才能导出。

Hosted / RBAC / Approval 代码保留为可选企业基础设施，但不进入普通设计与导出主流程。

Preflight 仍是生产质量门：严重错误可以阻止不安全的 Production PDF，但它不是人工审批门。

---

## 2. 参考产品吸收原则

### Pacdora

学习：

- 模板发现；
- 参数化 Generator；
- Manufacturing / Inner / Outer dimensions；
- 2D + 3D 联动；
- Fold 展开/闭合；
- 材质预览；
- PDF / SVG / DXF 等直接导出路径。

### Packform

学习：

- 顶部项目上下文；
- 窄左 Tool Rail；
- 左侧 Context / Parameter Panel；
- 中央 2D Canvas；
- 右侧常驻 3D / Inspector；
- 参数化结构 → 2D → 3D 的低切换成本工作流。

### BoxStudio 自身保留

- Shipping Marks；
- Variables；
- Barcode / QR Group；
- Excel / CSV Batch；
- Professional Dieline CAD；
- Production Preflight；
- Full Production PDF。

不复制第三方品牌资源、图标资源或像素级页面。

---

## 3. V0.40 第一阶段已实现

### Unified Editor Shell

编辑器重组为：

```text
Top Project Bar
┌ Tool Rail ┬ Context Panel ┬ 2D Canvas ┬ 3D / Inspector ┐
```

当前布局：

- Tool Rail：约 72 px；
- Context Panel：约 286 px；
- Central Canvas：弹性宽度；
- 3D / Inspector：约 360 px。

### Top Bar

新增：

- 当前项目名；
- 当前盒型；
- L × W × H；
- `V0.40 · FREE`；
- 2D；
- 3D；
- Split；
- Preflight；
- Export。

默认 Hosted/RBAC launcher 在普通编辑器中隐藏。

### Tool Rail

统一显示：

- Select；
- Text；
- Image；
- Shape；
- Line；
- Barcode；
- QR；
- Marks；
- Variable；
- Dieline CAD。

Dieline CAD 直接调用真实 V0.38 CAD，不建立第二套刀版编辑器。

### Context Panel

Structure 模式已提供：

- Length；
- Width；
- Height；
- Thickness；
- Flute。

这些输入不是新的影子状态。它们转发到现有真实 `[data-structure]` handler，因此继续进入原项目状态、历史、几何重算链。

### Persistent 3D / Inspector

右侧现在默认保持：

`3D Preview`

并允许手动切换到：

`Inspector`

默认不再因为已有 selectedId 就自动把 3D 替换成 Inspector。

3D 使用现有真实 `mountThreePreview()`，Headless Chrome 中已验证 offline canvas renderer 可工作。

### Free Export Flow

Export Context Panel 明确显示：

`No paywall · No approval gate`

Full Production PDF 直接调用 V0.39：

`BoxStudioV39.buildFullProductionPdf()`

因此仍保留 topology + preflight + mature production serializer，不通过审批状态决定是否可导出。

---

## 4. 当前真实联动

V0.40 Shell 当前已直接复用：

- V0.35 2D ↔ 3D Review；
- V0.38 Dieline CAD；
- V0.39 topology / Full Production PDF；
- legacy real Structure handlers；
- existing Preflight page。

目标不是重新做一套 V0.40 功能，而是逐步把旧版散落入口收敛到统一交互骨架。

---

## 5. 当前未完成

V0.40 第一阶段不是整个 UX 重构完成。

仍需继续：

1. Template Center → Generator → Editor 单一路径；
2. Pacdora 式模板 Detail / Generator 页面；
3. Manufacturing / Inner / Outer 尺寸在统一 Structure Panel 中完整可视；
4. flap taper / relief / notch / shoulder 等结构参数 UX；
5. Single Face / Multi Face / Full Dieline scope；
6. Face tabs；
7. Ruler / Guide / Grid / Snap 统一控制；
8. Tool Rail 与 V0.33/V0.34 实际工具状态彻底统一；
9. Marks Studio 从 overlay/旧入口彻底收敛到 Context Panel；
10. Export Center 统一 PDF / SVG / DXF / artwork / dieline / 3D；
11. 旧版重复按钮、旧 Tab 和各版本注入 UI 的进一步清理；
12. Inspector resize/collapse；
13. responsive/tablet acceptance；
14. 视觉密度和快捷键进一步对齐专业包装 CAD 使用习惯。

---

## 6. 结论

V0.40 第一阶段已经把产品从“很多版本模块叠在同一页面”向一个统一专业编辑器骨架推进，并把用户重新确认的免费策略落到默认 UI 和真实浏览器验收中。

下一阶段继续完成 Generator、Face-aware Design、统一 Marks、统一 Export 和剩余交互收敛，而不是重新转向审批/后台功能。
