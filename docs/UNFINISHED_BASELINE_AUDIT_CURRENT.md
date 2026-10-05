# BoxStudio 当前未完成清单（V0.39）

**审计日期**：2026-10-05  
**当前产品基准**：`docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**当前软件阶段**：V0.39 — Unified Structural Topology + Full Production Export  
**最新进度**：`docs/BASELINE_PROGRESS_V0.39.md`  
**测试记录**：`docs/V0.39_TEST_REPORT.md`

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

从 V0.32 到 V0.39，原始纸盒设计主线已经形成一条真正可工作的软件链：

- ✅ 5 个真实参数化盒型 + Template Center；
- ✅ Internal / External / Manufacturing 尺寸模式；
- ✅ Material / Flute / Thickness 工程参数；
- ✅ Professional 2D Editor；
- ✅ Marks Studio + Variables + Conditional Rules；
- ✅ 2D ↔ 3D linked review + Fold diagnostics + Material preview；
- ✅ Hosted Auth/RBAC/Immutable Revision/Audit；
- ✅ PostgreSQL durable persistence / idempotency / immutable archive；
- ✅ Semantic Dieline CAD；
- ✅ Dieline structural Preflight；
- ✅ 1:1 SVG / DXF / Dieline PDF；
- ✅ **edited CUT/CREASE → planar topology → rebuilt Panels**；
- ✅ **rebuilt Panels → crease adjacency → Fold Graph / hinge**；
- ✅ **Artwork panel reconciliation / orphan fail-closed**；
- ✅ **edited topology → existing full Production PDF pipeline**；
- ✅ **CAD edit → topology rebuild → Full Production PDF real browser E2E**。

因此，V0.39 已经关闭 V0.38 最大的数据断层：

> **编辑刀版后，Panel / Fold / Artwork / Full Production PDF 不再必然继续读旧 parametric geometry。**

当前最大的核心缺口变为：

> **真实 Polygon/Bezier Offset、Topology 人工 Review/Remap、Fold Angle/Hinge Override、结构工具、Raster production contract、20–30 高频盒型，以及真实 CAD / RIP / 工厂样箱验收。**

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
- [x] thickness compensation participates in geometry；
- [x] deterministic regression fixtures。

### 仍未完成

- [ ] 20–30 个高频生产盒型；
- [ ] 更完整 FEFCO / ECMA catalog；
- [ ] custom parametric template authoring；
- [ ] factory-specific compensation profiles；
- [ ] flute/material → real manufacturing allowance matrix；
- [ ] 复杂锁底、展示盒、抽屉盒、天地盖、Sleeve/Tray 完整生产矩阵。

### EXT

- [ ] 0427 / RTE / Auto-lock 与真实 CAD 叠图；
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
- [ ] legacy clip/cross-panel/live-assist 与统一 selection/history 的彻底收口；
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
- [ ] DataMatrix and more GS1 workflows；
- [ ] customer-specific validation packs；
- [ ] package-set mark template inheritance。

---

# 5. 2D ↔ 3D / Fold / Materials

## 当前：✅ review core / 🟡 physical fidelity

### 已完成

- [x] 2D click → 3D highlight；
- [x] 3D canvas click → 2D Panel Focus；
- [x] Split Review workspace；
- [x] near-live artwork refresh；
- [x] Fold 0–100%；
- [x] Fold diagnostics；
- [x] cycle / missing hinge / missing root / multiple parent checks；
- [x] Material / Flute / explicit thickness visual；
- [x] V0.39 rebuilt topology emits real shared-crease hinges；
- [x] V0.39 imported geometry proxy feeds rebuilt fold candidates；
- [x] real Headless Chrome 3D interaction gate。

### 仍未完成

- [ ] dedicated Panel/Fold topology review UI；
- [ ] fold angle override editor；
- [ ] hinge override editor；
- [ ] curved crease true hinge/bend model；
- [ ] real bend radius；
- [ ] crease compression / board spring-back；
- [ ] physical fold allowance；
- [ ] factory folding-machine sequence；
- [ ] high-fidelity PBR paper/corrugated materials；
- [ ] ICC-aware 3D soft proof；
- [ ] high-resolution GLB/render export。

---

# 6. Professional Dieline CAD / Structural Topology

## 当前：✅ CAD core + ✅ V0.39 topology core / 🟡 review tools

### 已完成

- [x] semantic Node / Edge / Panel / Zone document；
- [x] exact mm Node Inspector；
- [x] direct Node drag；
- [x] Edge selection；
- [x] CUT / CREASE / PERF / GLUE conversion；
- [x] Line / Cubic Bézier / Arc；
- [x] C1/C2 numeric / direct handle editing；
- [x] Add Node + exact cubic split；
- [x] safe degree-2 straight-node delete；
- [x] unsupported arc split fail-closed；
- [x] edited document persistence；
- [x] CAD workspace Preflight / SVG / DXF / Dieline PDF；
- [x] CUT/CREASE sampling into planar segments；
- [x] intersection / T-junction splitting；
- [x] half-edge bounded-face enumeration；
- [x] edited topology → rebuilt panel polygon/bbox；
- [x] surviving panel semantic identity retention；
- [x] crease-side panel adjacency；
- [x] rebuilt Fold Graph / physical hinge；
- [x] unresolved old Panel → `PANEL_REMAP_REQUIRED` fail-closed；
- [x] orphan Artwork → `ARTWORK_PANEL_ORPHAN`；
- [x] browser CAD edit → rebuilt topology persistence。

### P0/P1 仍未完成

- [ ] **true arbitrary Polygon / Bézier Offset engine**；
- [ ] offset join / miter / round / self-intersection repair；
- [ ] Panel Remap UI；
- [ ] Fold Angle Review / Override UI；
- [ ] Hinge Override UI；
- [ ] curved crease physical fold model；
- [ ] native Arc split；
- [ ] tangent/smooth/symmetric handle modes；
- [ ] Slot / Notch / Tab structural tools；
- [ ] Dimension annotation / constraint tools；
- [ ] panel auto-detection hardening for messy external CAD；
- [ ] custom structure authoring / reusable structural components。

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
- [x] raster effective DPI when metadata exists；
- [x] missing DPI metadata warning；
- [x] Polygon Offset review warning；
- [x] Fold Graph review after semantic changes；
- [x] V0.39 topology errors enter Production gate；
- [x] `PANEL_REMAP_REQUIRED` blocking；
- [x] `ARTWORK_PANEL_ORPHAN` blocking；
- [x] incomplete marks still block V0.39 full Production PDF。

### 仍未完成

- [ ] complete manufacturability rules per box family；
- [ ] advanced font embeddability / min-size policies；
- [ ] OTF / CFF / CFF2 independent glyph-path measurement；
- [ ] full raster alpha / overprint / color-space policies；
- [ ] customer barcode profile / quiet-zone policies；
- [ ] issue → exact object / node / Excel cell unified navigator；
- [ ] safe guided fixes；
- [ ] external preflight adapter。

### EXT

- [ ] ISO barcode physical scanner grading；
- [ ] real RIP raster/separation validation；
- [ ] Acrobat / callas / formal PDF/X validation；
- [ ] press proof。

---

# 8. Production Export

## 当前：✅ software unified core / 🟡 export UX & external validation

### 已完成

- [x] mature Artwork Production PDF pipeline；
- [x] native Barcode/QR vectors；
- [x] ICC / DeviceLink subset；
- [x] PDF/X-4 Candidate subset；
- [x] batch/multi-page PDF；
- [x] 1:1 Dieline SVG；
- [x] DXF mm + semantic layers；
- [x] 1:1 Dieline PDF；
- [x] Separation Spot resources；
- [x] browser-safe Dieline PDF builder；
- [x] **V0.39 edited `dielineV38` → rebuilt panels/folds → full Artwork Production PDF**；
- [x] **panel-local artwork resolves through rebuilt panel origin**；
- [x] **V0.39 reuses V0.27 production serializer rather than parallel degraded exporter**；
- [x] **real browser Full Production PDF generation**。

### 仍未完成

- [ ] unified Export Center UX；
- [ ] Production / Artwork / Dieline / 3D profiles；
- [ ] Artwork Only；
- [ ] JPG；
- [ ] GLB；
- [ ] high-resolution 3D render；
- [ ] SVG round-trip acceptance；
- [ ] DXF third-party real-CAD round-trip；
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
- [x] leading-zero / import-review hardening；
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

---

# 11. Browser E2E 当前覆盖

已进入真实 Headless Chrome gate：

- [x] V0.33 Professional 2D Editor；
- [x] V0.34 Marks Studio；
- [x] V0.35 2D↔3D Review；
- [x] V0.36 Hosted Operator → Approver workflow；
- [x] V0.38 Dieline CAD；
- [x] **V0.39 CAD node edit → Rebuild Topology → topology persistence → Full Production PDF**。

V0.39 browser proof 已实际得到：

```text
PASS cad-node=n3:120.0→121.5 panels=13 folds=12 pdf=23431
```

仍缺完整长旅程：

- [ ] Template → Dimension → 2D Artwork → Marks → 3D → CAD → Topology → Preflight → Approval → Full Production Export；
- [ ] downloaded file byte/content verification via browser filesystem；
- [ ] multi-template E2E matrix；
- [ ] external CAD import → repair → panel mapping → export；
- [ ] mobile/tablet acceptance。

---

# 12. 当前优先级

## P0 — 下一主线

1. **Polygon / Bézier Production Offset Engine**；
2. **Topology Review UI：Panel Remap / Fold Angle / Hinge Override**；
3. **Slot / Notch / Tab / Dimension / Constraint structural tools**；
4. **Raster production contract：PNG/JPEG + DPI/ICC/alpha/crop**；
5. **full end-to-end production journey browser acceptance**。

## P1

6. 20–30 个高频盒型；
7. Export Center / Artwork Only / JPG / GLB；
8. `.boxproj` portable project；
9. multi-template topology/export fixtures；
10. imported CAD panel detection / repair hardening。

## P2 / EXT

11. real CAD round-trip；
12. formal PDF/X / RIP；
13. physical barcode grade；
14. factory compensation / sample folding；
15. enterprise SSO/SCIM/HA/WAF only after core product gaps。

---

# 13. 当前发布判断

BoxStudio 已经进入**结构编辑与生产输出开始使用同一语义链路**的软件阶段。V0.39 的关键变化不是多一个导出按钮，而是：

```text
edited Node / Edge
→ rebuilt Panel topology
→ rebuilt Fold adjacency / hinge
→ reconciled Artwork
→ Preflight
→ existing mature Full Production PDF
```

但在以下条件完成前，仍不应宣称完全替代 ArtiosCAD / Illustrator / Esko 的生产工作流：

- arbitrary curved bleed/safe offset；
- topology review/remap/fold override UX；
- 20–30 高频 production structures；
- robust raster production contract；
- real-CAD / formal PDF/X / RIP / factory sample acceptance。

V0.39 的意义是：**V0.38 让刀版成为真正可编辑的语义对象；V0.39 让这个语义刀版第一次真正驱动 Panel、Fold、Artwork 和完整 Production PDF。**
