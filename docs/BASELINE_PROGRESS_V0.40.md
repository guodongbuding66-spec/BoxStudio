# BoxStudio V0.40 — Free-first Product + Production Geometry

Date: 2026-10-05
Status: implementation complete on PR branch; final merge acceptance requires all CI gates green on the frozen head.

## Product-direction correction

V0.40 re-centers BoxStudio on the original requirement:

> A free browser paper-box design website inspired by the workflow strengths of Pacdora and Packform, with Shipping Mark editing as a first-class capability.

Current default product rules:

- free for everyone;
- no login required;
- no subscription/paywall;
- no approval/reviewer step for normal design or production export;
- production export is gated by objective structural/preflight checks only.

V0.36/V0.37 Hosted Auth/RBAC/Approval/PostgreSQL code is retained only as an optional future collaboration foundation.

## Reference re-study

The current public Pacdora and Packform pages were re-studied before this implementation pass.

### Pacdora patterns adopted at workflow level

- template-first start;
- simple size / material / thickness customization;
- fast transition from structure to 3D;
- production format export;
- structure, artwork and 3D kept in one browser workflow;
- import dieline → fold → continue design pattern.

### Packform patterns adopted at professional-editor level

- millimeter 2D canvas;
- editable structural nodes/lines;
- line / arc / Bézier editing;
- bleed/safe/panel-boundary concepts;
- structural validation;
- 2D ↔ 3D linkage;
- SVG production-oriented structure export.

BoxStudio does not copy third-party branding, proprietary graphics, text, or pixel-identical screens. It borrows workflow and interaction principles.

A screenshot-by-screenshot live interaction audit is not claimed in this pass because the metered interactive-browser service was unavailable. That limitation is recorded in `V0.40_REFERENCE_RESTUDY.md`.

## Free access policy

Added `src/freeAccessV40.js`.

The policy is executable product data rather than marketing copy:

```text
mode = free-public
price = 0
requiresLogin = false
requiresApproval = false
requiresSubscription = false
```

Free capabilities include:

- Templates
- Parametric Structure
- 2D Editor
- Dieline CAD
- Marks
- Barcode / QR
- Variables / Rules
- 3D / Fold Preview
- Preflight
- SVG / DXF / PDF
- Full Production PDF
- Batch tools
- Dieline Import
- Production Offsets

## Default application shell

V0.40 changes the normal application shell:

- Hosted Approval UI is no longer loaded by default.
- `FREE · No login · No approval` appears in the main shell.
- The main flow is now visible as:

```text
1 选择盒型
2 尺寸 / 材料
3 平面设计
4 3D 检查
5 Preflight
6 导出
```

This combines a low-threshold template workflow with the existing professional editor underneath it.

The old V0.32 template module was also corrected so it no longer owns the global page/product version. The V0.40 shell is now authoritative for `document.title` and the visible brand version.

## Production Offset Engine

Added `src/offsetEngineV40.js`.

Implemented:

- polygon outward offset for Bleed;
- polygon inward offset for Safe Area;
- Miter Join;
- Bevel Join;
- Round Join;
- Miter Limit;
- Self-intersection detection;
- bounded self-intersection repair attempt;
- fail-closed result if repair cannot produce a valid polygon;
- per-panel bounds/area/repair metadata.

The engine consumes V0.39 rebuilt panel polygons, not the old V0.38 rectangular placeholder zones.

## V0.40 Preflight

Added `src/preflightV40.js`.

The previous placeholder warning:

```text
POLYGON_OFFSET_REVIEW
```

is removed from the V0.40 production path when real offsets are successfully generated.

New checks include:

- every bounded panel must receive a Bleed polygon;
- every bounded panel must receive a Safe polygon;
- Bleed area must expand beyond the panel area;
- Safe area must inset below the panel area;
- offset self-intersection/collapse remains blocking.

## Full Production PDF

Added `src/productionPdfV40.js`.

V0.40 does not replace the mature V0.39/V0.27 PDF renderer.

The path is:

```text
V0.39 rebuilt topology
→ V0.40 polygon offsets
→ V0.40 Preflight
→ V0.39 production proxy
→ mature V0.27 Production PDF renderer
```

The production gate now explicitly reports:

```text
requiresApproval = false
requiresLogin = false
price = 0
```

Production remains fail-closed on objective Preflight errors.

## Dieline CAD UI

V0.40 extends the existing V0.38 CAD without creating a parallel editor.

Added:

- Production Offset section;
- Miter / Round / Bevel selector;
- Generate Bleed / Safe action;
- true polygon Bleed overlay;
- true polygon Safe overlay;
- Production Preflight action;
- Full Production PDF action;
- free/no-approval explanatory text.

The old V0.38 rectangle zone overlays are hidden while V0.40 production polygons are active.

## Browser lifecycle hardening

The first V0.40 Browser E2E runs exposed a real UI lifecycle issue.

Initial implementation watched all `document.body` subtree child mutations and queued another microtask for every mutation. CAD rendering, V0.39 controls, and V0.40 overlays could therefore keep generating observer work.

Fixed by making the V0.40 observer selective:

- react only to a new main `.app` shell;
- react only to creation of `#boxstudio-v38-cad`;
- ignore V0.40's own buttons, badges, flow strip and offset polygons.

This is a production UI fix, not a test-only workaround.

## Current acceptance scope

V0.40 automated acceptance covers:

- free access policy;
- exact rectangular offset geometry;
- Miter / Bevel / Round joins;
- real default RSC topology → per-panel Bleed/Safe;
- V0.40 Preflight replacement of placeholder offset warning;
- no-login/no-approval Production Gate;
- mature Full Production PDF preservation;
- browser shell version consistency;
- real guided navigation into Editor;
- real Dieline CAD opening;
- real polygon offset overlay generation;
- runtime switch to Round Join;
- real Full Production PDF bytes in Headless Chrome.

## Explicitly not claimed complete

V0.40 does not yet claim:

- exact analytical offset of native Bézier curves without flattening;
- exact native Arc offset/split kernel;
- industrial-strength boolean polygon union/difference for arbitrary pathological geometry;
- ArtiosCAD / Esko / AutoCAD external acceptance;
- RIP / die-maker validation;
- physical sample validation;
- pixel-identical Pacdora/Packform UI cloning;
- full visual-interaction audit of every reference-site screen.

These remain future validation or implementation items.
