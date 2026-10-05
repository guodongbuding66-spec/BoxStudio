# BoxStudio V0.39 — Unified Structural Topology + Full Production Export

**产品主线**：参数化纸盒结构设计 + Professional 2D + 3D Fold Review + Marks + Preflight + Production Export  
**版本目标**：关闭 V0.38 之后最关键的数据断层，让“编辑后的语义刀版”真正成为 Panel、Fold、Artwork 和完整 Production PDF 的共同结构源。

---

## 1. 本版核心结果

V0.39 新增 `boxstudio-structural-topology-v39`，把 V0.38 的 `dielineV38` 从“可编辑刀版”推进为可重新求解结构拓扑的生产数据源。

当前主链变为：

```text
V0.38 Dieline CAD
→ edited CUT / CREASE graph
→ planarization / intersection split
→ bounded panel faces
→ stable panel identity
→ crease adjacency
→ Fold Graph / hinge
→ artwork reconciliation
→ V0.38 Preflight
→ Imported Geometry Proxy
→ existing V0.27 full Production PDF renderer
```

因此，V0.39 不另外复制一套缩水版 PDF 生成器，而是把编辑后重建的 geometry 注入已有成熟生产管线，继续复用已有：

- Spot / CutContour / Crease；
- ICC / DeviceLink subset；
- Barcode / QR native vector；
- outlined text / font handling；
- gradient / soft mask；
- cross-panel artwork；
- existing V0.23–V0.27 production serialization。

---

## 2. Planar Topology Rebuild

### 已实现

- [x] CUT / CREASE Line / Cubic / Arc 受控采样；
- [x] Segment intersection detection；
- [x] T-junction 节点化；
- [x] cross-intersection 节点化；
- [x] collinear endpoint handling；
- [x] sub-segment deduplication；
- [x] coincident semantic resolution；
- [x] half-edge planar graph；
- [x] angle-sorted outgoing edges；
- [x] bounded-face enumeration；
- [x] face polygon / bbox / area / centroid；
- [x] rebuilt panel map。

默认 RSC 回归明确验证：长横向 CREASE 与多条竖向 CUT/CREASE 的视觉交点会先被真正拆成拓扑节点，而不是只在 SVG 上相交。

---

## 3. Panel Identity / Fail-closed

重建新面后，系统会优先使用旧 Panel polygon 的空间语义匹配，保留可确认的 Panel ID / label / role / kind。

### 已实现

- [x] centroid-in-polygon semantic matching；
- [x] geometry proximity matching for a surviving face；
- [x] old → rebuilt panel ID map；
- [x] artwork panel reference reconciliation；
- [x] orphan artwork detection；
- [x] unresolved old panel identity blocks production。

### 重要安全规则

如果旧 Panel 在结构修改后消失、合并或无法可靠确认身份，V0.39 不再静默把它“就近映射”到另一个面。

此时升级为：

```text
PANEL_REMAP_REQUIRED
```

并从自动 `panelIdMap` 中移除该不确定映射。与其错误生产，不如阻断并要求人工确认。

---

## 4. Fold Graph Rebuild

V0.39 不再仅依赖模板静态 Fold Graph，而是从重建后的面共享 CREASE 关系重新建立邻接。

### 已实现

- [x] CREASE 两侧 bounded face discovery；
- [x] panel-pair fold adjacency；
- [x] physical shared hinge segment；
- [x] fold traversal / root；
- [x] surviving semantic panel pair 复用旧 fold angle；
- [x] fold candidate 输出给 existing imported geometry path；
- [x] unreached-panel warning；
- [x] curved hinge approximation warning。

### Fail-visible 边界

如果一个新邻接关系没有可继承的语义折叠角，系统不会假定它已得到工厂确认，而是给出 90° review default 并触发：

```text
FOLD_ANGLE_REVIEW
```

曲线压线当前的 3D hinge 仍使用端点直线近似，并触发 `CURVED_HINGE_REVIEW`。

---

## 5. Artwork Reconciliation

### 已实现

- [x] surviving Panel ID 下 artwork 保持 panel-local coordinates；
- [x] verified panel remap 时同步 element.panelId；
- [x] deleted/unresolved panel artwork → `ARTWORK_PANEL_ORPHAN`；
- [x] production gate fail-closed；
- [x] existing `resolveElementRect()` 继续使用 rebuilt `panelMap`。

核心回归场景：

- 原两个面：50 mm / 50 mm；
- 把中间 CREASE 从 `x=50 mm` 移到 `x=60 mm`；
- rebuilt panels 必须成为 `60 mm / 40 mm`；
- Fold hinge 必须成为 `x=60 mm`；
- BACK 面 local `x=5 mm` artwork 在最终 Production PDF 必须落到 absolute `x=65 mm`。

这些坐标均已进入自动回归。

---

## 6. Full Production PDF

V0.39 新增 `boxstudio-production-v39` production context。

### 生产路径

1. rebuild semantic topology；
2. run topology gate；
3. reconcile artwork；
4. create Imported Geometry Proxy；
5. run V0.38 broad Preflight against rebuilt document；
6. only when no blocking errors：
7. call existing `buildProductionPdfV27()`。

### 已实现

- [x] edited CUT / CREASE geometry enters full PDF pipeline；
- [x] rebuilt panels enter production artwork planning；
- [x] rebuilt fold candidates enter imported fold graph；
- [x] panel-local artwork uses rebuilt panel origin；
- [x] existing Spot / ICC / QR / Barcode / font / vector behavior preserved；
- [x] incomplete marks remain blocked by existing Preflight；
- [x] topology errors block full Production PDF；
- [x] orphan artwork blocks full Production PDF。

没有通过关闭 CRN / Barcode / Package Notice 等旧规则来“让 V0.39 变绿”。

---

## 7. V0.39 Browser UX

主工作区新增：

- `Rebuild Topology`
- `Full Production PDF`
- topology status：Panels / Folds / Errors / Warnings

V0.38 Dieline CAD 顶栏新增：

- `Rebuild Panels`
- `Full Production PDF`

安全规则：

- topology / production context BLOCKED 时 Full Production PDF 禁用；
- 只有 topology + artwork + Preflight 都通过后才允许完整生产导出；
- project 保存的是 rebuilt semantic `dielineV38` + `topologyV39`，不会把项目主结构永久偷换成 temporary imported proxy。

---

## 8. 真实 CI / Browser E2E

V0.39 专用 Domain Regression 已验证：

- default RSC rebuilt faces = 13；
- edited synthetic faces = 2；
- 50 → 60 mm crease edit；
- full renderer edited PDF = 2224 bytes；
- production-gated default PDF = 23431 bytes。

真实 Headless Chrome E2E 已执行：

1. 打开 V0.38 Dieline CAD；
2. 通过真实 Node Inspector 把 `n3.x: 120.0 → 121.5 mm`；
3. 保存并退出 CAD；
4. 点击 `Rebuild Topology`；
5. 验证 localStorage 中 `topologyV39`；
6. 验证 13 panels；
7. 验证 12 fold-tree edges；
8. 验证 CAD 编辑没有丢失；
9. 验证 Production 状态为 PASS；
10. 点击 `Full Production PDF`；
11. 验证浏览器内实际生成 23431-byte PDF。

最终 PASS：

```text
PASS cad-node=n3:120.0→121.5 panels=13 folds=12 pdf=23431
```

---

## 9. CI 期间实际发现的问题

### 9.1 Preflight 被测试夹具正确阻断

第一版 synthetic fixture 为了只看 geometry，把真实 marks 删除。V0.38 Preflight 正确阻断 CRN / Barcode-QR / Package Notice。

处理方式：没有降低 Preflight，而是把验收拆成：

- edited coordinate → existing full PDF renderer；
- real valid default project → V0.39 production gate → full PDF。

### 9.2 Deleted Panel 被 nearest remap

结构被破坏后，低层 engine 仍可能为新 face 找最近旧 panel semantic。

生产层改为 fail-closed facade：任何未直接确认的旧 Panel identity 都升级为 `PANEL_REMAP_REQUIRED`，不再自动生产。

### 9.3 V0.38 package version test 误报

V0.38 回归原来硬编码 `package.json.version === 0.38.0`。V0.39 正常升版后导致 V0.38 workflow 红灯。

修复为：V0.38 regression 要求 package version **不得低于 0.38.0** 且 `test:v38` 仍存在。V0.38 功能断言没有删除或放宽。

---

## 10. 明确未完成 / 不虚报

V0.39 已经关闭“edited edge → Panel/Fold/Artwork/full PDF”这一软件数据链的核心断层，但仍未完成：

- arbitrary Polygon / Bézier true offset engine；
- native curved crease fold surface / bend model；
- new topology 的人工 Panel/Fold remap UI；
- full interactive fold-angle / hinge override editor；
- slot / notch / tab / structural constraint tools；
- PNG/JPEG production-safe raster contract；
- 20–30 个高频 production templates；
- complete Export Center；
- real AutoCAD / ArtiosCAD / Esko round-trip；
- formal PDF/X third-party validation；
- real RIP / press / physical sample acceptance；
- factory-specific crease / flute compensation matrix。

---

## 11. 下一主线

V0.40 应继续纸盒设计核心，而不是企业外围：

1. **Production Offset Engine**：Polygon / Bézier Bleed / Safe true offset + self-intersection repair；
2. **Topology Review UI**：Panel Remap / Fold Angle / Hinge Override；
3. **Structural tools**：Slot / Notch / Tab / Dimension / Constraints；
4. **Raster production contract**：PNG/JPEG + DPI/ICC/alpha/crop；
5. **End-to-end production journey**：Template → 2D → Marks → 3D → CAD → Topology → Preflight → Full Production PDF。
