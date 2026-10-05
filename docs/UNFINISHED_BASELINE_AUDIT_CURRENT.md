# BoxStudio 当前未完成清单（V0.38）

**审计日期**：2026-10-05  
**当前产品基准**：`docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**当前软件阶段**：V0.38 — Professional Dieline CAD / Production Preflight / Dieline Export  
**最新进度**：`docs/BASELINE_PROGRESS_V0.38.md`  
**测试记录**：`docs/V0.38_TEST_REPORT.md`

> 主原则保持不变：BoxStudio 首先是“参数化纸盒结构设计 + 专业 2D 包装设计 + 3D 成盒审校 + 唛头 + Preflight + 生产文件”的产品。Backend / ERP / SSO 只能服务于这条主线，不能再次取代它。

---

## 状态定义

| 状态 | 含义 |
|---|---|
| ✅ software | 已有真实实现，并进入自动回归 / 浏览器验收 |
| 🟡 | 已可用，但仍有明确生产、UX、数据模型或覆盖缺口 |
| ⬜ | 尚未形成可用实现 |
| EXT | 必须依赖真实 CAD、RIP、扫描器、印厂或物理样箱才能最终验收 |

**`✅ software` 不等于 `factory certified`。**

---

# 1. 当前总体结论

从 V0.32 到 V0.38，原始纸盒设计主线已经重新建立：

- ✅ 5 个真实参数化盒型引擎 + Template Center；
- ✅ Internal / External / Manufacturing 尺寸模式；
- ✅ Material / Flute / Thickness 工程参数；
- ✅ Professional 2D Editor；
- ✅ Marks Studio + Variables + Conditional Rules；
- ✅ 2D ↔ 3D linked review + Fold diagnostics + Material preview；
- ✅ Hosted Auth/RBAC/Immutable Revision/Audit；
- ✅ PostgreSQL durable persistence / idempotency / immutable archive；
- ✅ V0.38 Semantic Dieline CAD；
- ✅ V0.38 Dieline structural Preflight；
- ✅ V0.38 1:1 SVG / DXF / Dieline PDF。

因此，当前最大缺口已经不再是“有没有编辑器/后台/3D/刀版编辑”，而是：

> **任意 CAD 修改后的 Panel / Fold topology 自动重建、真实 Polygon/Bezier Offset、edited dieline 驱动完整 Artwork Production PDF、20–30 高频盒型、Raster production contract，以及真实 CAD / RIP / 工厂样箱验收仍未完成。**

这些应成为后续主线，而不是继续扩张企业后台。

---

# 2. Template Center / Parametric Box Engine

## 当前：✅ software / 🟡 catalog / EXT factory acceptance

### 已完成

- [x] Template Center；
- [x] 搜索 / category / FEFCO / Model / tag；
- [x] 几何预览；
- [x] 从模板创建项目；
- [x] FEFCO 0201 / RSC；
- [x] Mailer 150010；
- [x] FEFCO 0427 engineering core；
- [x] Reverse Tuck End engineering core；
- [x] Auto-lock Bottom engineering core；
- [x] Internal / External / Manufacturing dimension modes；
- [x] Material / flute presets；
- [x] Thickness participates in geometry compensation；
- [x] deterministic regression fixtures。

### 仍未完成

- [ ] 20–30 个高频生产盒型；
- [ ] FEFCO / ECMA 更完整 catalog；
- [ ] custom parametric template authoring；
- [ ] factory-specific compensation profiles；
- [ ] flute/material → real manufacturing allowance matrix；
- [ ] 复杂锁底、展示盒、抽屉盒、天地盖、Sleeve/Tray 等完整生产矩阵。

### EXT

- [ ] 0427 / RTE / Auto-lock 与真实 CAD 叠图验收；
- [ ] 打样折盒；
- [ ] 压线中心 / 刀模厂确认；
- [ ] 不同纸板/楞型真实补偿矩阵。

---

# 3. Professional 2D Editor

## 当前：✅ core / 🟡 hardening

### 已完成

- [x] true-mm Professional 2D workspace；
- [x] 多选 / Group / Ungroup；
- [x] Copy / Paste / Duplicate / Delete；
- [x] Z-order；
- [x] Align / Distribute；
- [x] X / Y / W / H / R；
- [x] Panel reassignment；
- [x] drag / resize / rotate；
- [x] object / layer hide-lock；
- [x] object list；
- [x] Panel Focus / Fit All；
- [x] Undo / Redo；
- [x] keyboard nudge；
- [x] Table primitives；
- [x] SVG vector artwork placement；
- [x] real Headless Chrome interaction gate。

### 仍未完成

- [ ] PNG / JPEG production-safe placement；
- [ ] Raster embed / DPI / ICC / alpha / crop contract；
- [ ] marquee selection polish；
- [ ] cross-panel paste-target UX；
- [ ] aspect-lock / anchor / transform-origin 完整化；
- [ ] top-level layer reorder；
- [ ] legacy clip/cross-panel/live-assist 与 V0.33 selection/history 的完全统一；
- [ ] mobile/tablet editing acceptance；
- [ ] 多模板 drag/resize/rotate 浏览器矩阵。

---

# 4. Shipping Marks / Variables / Rules

## 当前：✅ core / 🟡 advanced template management

### 已完成

- [x] 独立 Marks Studio；
- [x] SKU / N.W. / G.W. / Dimensions / Origin / Destination / CRN / Contract；
- [x] Barcode + QR；
- [x] Handling icons / Custom symbols；
- [x] `{{variable}}` picker / binding；
- [x] Variable Usage Map；
- [x] Missing Variable visualization；
- [x] Reusable Blocks；
- [x] Customer / Mark presets；
- [x] SHOW/HIDE conditions；
- [x] Package Count / Country / Customer / arbitrary variable conditions；
- [x] Rule Preview / Debug；
- [x] production artwork plan receives rule visibility；
- [x] real browser rule workflow regression。

### 仍未完成

- [ ] hosted customer/template administration；
- [ ] template impact analysis after master update；
- [ ] richer regulatory symbol catalogs；
- [ ] DataMatrix and additional GS1 workflows；
- [ ] customer-specific validation packs；
- [ ] package-set level mark template inheritance。

---

# 5. 2D ↔ 3D / Fold / Materials

## 当前：✅ review core / 🟡 physical fidelity

### 已完成

- [x] 2D click → 3D highlight；
- [x] 3D real canvas click → 2D Panel Focus；
- [x] Split Review workspace；
- [x] near-live artwork refresh；
- [x] Fold 0–100%；
- [x] Fold direction / dependency diagnostics；
- [x] cycle / missing hinge / missing root / multiple parent checks；
- [x] Material / Flute / explicit thickness visual；
- [x] browser canvas coordinate mapping regression；
- [x] real Headless Chrome 3D interaction gate。

### 仍未完成

- [ ] real bend radius；
- [ ] crease compression / board spring-back；
- [ ] physical fold allowance；
- [ ] factory folding-machine sequence；
- [ ] high-fidelity PBR paper/corrugated materials；
- [ ] ICC-aware 3D soft proof；
- [ ] high-resolution GLB/render export path。

---

# 6. Professional Dieline CAD

## 当前：✅ V0.38 core / 🟡 topology rebuild

### 已完成

- [x] semantic Node / Edge / Panel / Zone document；
- [x] exact mm Node Inspector；
- [x] direct Node drag；
- [x] Edge selection；
- [x] CUT / CREASE / PERF / GLUE conversion；
- [x] Line / Cubic Bézier / Arc；
- [x] C1/C2 numeric editing；
- [x] visible draggable Bézier handles；
- [x] Add Node；
- [x] exact cubic split；
- [x] safe degree-2 straight-node delete；
- [x] unsupported arc split fail-closed；
- [x] edited document persistence；
- [x] Bleed / Safe / Glue rectangular production zones；
- [x] CAD workspace Preflight / SVG / DXF / Dieline PDF；
- [x] real browser CAD interaction regression。

### P0 未完成

- [ ] **edited Edge topology → Panel polygon/rect 自动重建**；
- [ ] **Panel topology → Fold Graph 自动重建**；
- [ ] Fold hinge semantic editing / override；
- [ ] arbitrary Polygon / Bézier Offset engine；
- [ ] offset join / miter / round / self-intersection repair；
- [ ] curved-node delete with tangent continuity；
- [ ] native Arc split；
- [ ] tangent/smooth/symmetric handle modes；
- [ ] Slot / Notch / Tab structural tools；
- [ ] Dimension annotation / constraint tools；
- [ ] panel auto-detection hardening after imported CAD；
- [ ] custom structure authoring / reusable structural components。

当前只要 CUT/CREASE 语义发生变化，Preflight 会发出 `FOLD_GRAPH_REVIEW_REQUIRED`，不会假定旧 Fold Graph 仍正确。

---

# 7. Preflight

## 当前：✅ broad software gate / 🟡 production hardening / EXT external validation

### 已完成

- [x] marks / variable required checks；
- [x] Barcode/QR digital decode；
- [x] final-PDF damage negative regression；
- [x] geometry acceptance / outlined technical text hardening；
- [x] unsupported rotation/font paths fail-closed；
- [x] Dieline missing node / degenerate edge；
- [x] CUT intersection；
- [x] duplicate / open endpoint warning；
- [x] Bleed / Safe coverage；
- [x] Artwork crossing edited CREASE；
- [x] raster effective DPI when pixel metadata exists；
- [x] missing DPI metadata warning；
- [x] Polygon Offset review warning；
- [x] Fold Graph re-review after semantic changes；
- [x] Preflight visible in Dieline CAD UI。

### 仍未完成

- [ ] true closed-contour/component analysis for every complex curved CUT path；
- [ ] complete structural manufacturability rules per box family；
- [ ] advanced font embeddability / outline / min-size policies；
- [ ] OTF / CFF / CFF2 independent glyph-path measurement；
- [ ] full raster alpha / overprint / color-space policies；
- [ ] customer-specific barcode profile / quiet-zone policies；
- [ ] issue → exact object / node / Excel cell unified navigator；
- [ ] one-click guided fixes where safe；
- [ ] external preflight adapter。

### EXT

- [ ] ISO barcode physical scanner grading；
- [ ] real RIP raster/separation validation；
- [ ] Acrobat / callas / third-party PDF/X validation；
- [ ] press proof。

---

# 8. Production Export

## 当前：✅ strong foundation / 🟡 semantic unification

### 已完成

- [x] mature Artwork Production PDF pipeline；
- [x] native Barcode/QR vectors；
- [x] ICC / DeviceLink subset；
- [x] PDF/X-4 Candidate subset；
- [x] batch/multi-page PDF；
- [x] V0.38 1:1 Dieline SVG；
- [x] V0.38 DXF mm + CUT/CREASE/PERF/GLUE/BLEED/SAFE layers；
- [x] V0.38 1:1 Dieline PDF；
- [x] Separation Spot resources；
- [x] browser-safe Dieline PDF builder。

### P0 未完成

- [ ] **edited `dielineV38` + rebuilt Panel topology → full Artwork Production PDF**；
- [ ] Production Artwork / Dieline / Bleed / Marks 使用完全统一语义模型；
- [ ] Artwork Only / Dieline Only / Production Profile 统一 Export Center UX；
- [ ] SVG round-trip import/export acceptance；
- [ ] DXF third-party real-CAD round-trip；
- [ ] JPG；
- [ ] GLB；
- [ ] high-resolution 3D render；
- [ ] export profiles / filename policies / per-template fixtures。

### EXT

- [ ] formal PDF/X pass；
- [ ] real RIP separation / overprint；
- [ ] AutoCAD / ArtiosCAD / Esko / factory CAD round-trip。

---

# 9. Excel Batch / Master Templates

## 当前：✅ substantial foundation / 🟡 workflow completeness

### 已完成

- [x] XLSX / CSV；
- [x] multi-sheet；
- [x] mapping / aliases / header detection；
- [x] leading-zero and import review hardening；
- [x] source lineage；
- [x] worker batch；
- [x] partial failure / retry；
- [x] ZIP / failed-row review；
- [x] mapping profiles / master-template foundations。

### 仍未完成

- [ ] duplicate bilingual header policy；
- [ ] formula evaluation policy；
- [ ] complex/scientific number format recovery；
- [ ] richer inline correction；
- [ ] re-upload compare；
- [ ] large workbook benchmark；
- [ ] package-set grouped outputs；
- [ ] hosted Master/Customer Template lifecycle UI；
- [ ] change-impact preview。

---

# 10. Project Reliability / Hosted Production Authority

## 当前：✅ service authority + durable DB / 🟡 product-file lifecycle

### 已完成

- [x] Hosted REST API；
- [x] server-authoritative RBAC；
- [x] immutable ArtworkRevision；
- [x] submit / approve / reject + separation of duties；
- [x] append-only hash-chain audit；
- [x] PostgreSQL durable users/sessions/projects/revisions/workflows；
- [x] idempotency；
- [x] multi-instance revision concurrency protection；
- [x] immutable Production Archive database records；
- [x] real HTTP + real browser workflow CI。

### 仍未完成，但不应抢核心主线

- [ ] `.boxproj` portable project package；
- [ ] assets pack/restore；
- [ ] project version compare/restore UX；
- [ ] object storage for large assets/artifacts；
- [ ] backup/PITR orchestration；
- [ ] WORM archive storage；
- [ ] SSO / SCIM / MFA；
- [ ] WAF / production ingress hardening；
- [ ] cross-region HA。

这些属于产品可靠性/企业部署，不应先于 Dieline/Panel/Export 核心缺口。

---

# 11. Browser E2E 当前覆盖

已进入真实 Headless Chrome gate：

- [x] V0.33 Professional 2D Editor；
- [x] V0.34 Marks Studio；
- [x] V0.35 2D↔3D Review；
- [x] V0.36 Hosted Operator → Approver workflow；
- [x] V0.38 Dieline CAD：CUT→CREASE、Cubic、Add Node、numeric edit、Node drag、Bezier handle drag、Preflight、SVG/DXF/PDF。

仍缺完整用户旅程：

- [ ] Template → Dimension → 2D Artwork → Marks → 3D → Dieline CAD → Preflight → Approval → Full Production Export；
- [ ] file download content verification in browser；
- [ ] multi-template E2E matrix；
- [ ] import external CAD → repair → panel mapping → export；
- [ ] mobile/tablet acceptance。

---

# 12. 当前优先级

## P0 — 下一主线

1. **Panel topology rebuild from edited semantic edges**；
2. **Fold Graph rebuild / override**；
3. **Polygon/Bezier Offset engine**；
4. **edited Dieline → full Artwork Production PDF**；
5. **end-to-end production browser acceptance**。

## P1

6. 20–30 个高频盒型；
7. Slot / Notch / Tab / Dimension / Constraint 工具；
8. Raster artwork production contract；
9. Export Center / JPG / GLB；
10. `.boxproj` portable project。

## P2 / EXT

11. real CAD round-trip；
12. formal PDF/X / RIP；
13. physical barcode grade；
14. factory compensation / sample folding；
15. enterprise SSO/SCIM/HA/WAF only after core product gaps。

---

# 13. 当前发布判断

BoxStudio 已经从早期“很多独立功能模块”进入**可连成专业包装设计链路的软件阶段**。但在以下条件完成前，不应宣称完全替代 ArtiosCAD / Illustrator / Esko 的生产工作流：

- edited edge → panel/fold topology 自动一致；
- arbitrary curved bleed/safe offset；
- edited topology 驱动 full artwork production export；
- real-CAD / RIP / factory sample acceptance。

V0.38 的意义是：**刀版第一次成为真正可编辑、可持久、可 Preflight、可生产导出的语义对象。下一步必须让 Panel、Fold、Artwork 与这个语义刀版彻底统一。**
