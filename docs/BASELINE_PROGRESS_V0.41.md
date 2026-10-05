# BoxStudio V0.41 — Template Generator + Reference Interaction Layer

## Product policy

V0.41 continues the reset baseline derived from direct study of Pacdora and Packform/ds.mxder:

- core box design is free for everyone;
- no watermark;
- no export quota/paywall in the default workflow;
- no approval/role gate for ordinary design and export;
- Hosted/Auth/RBAC remains optional infrastructure and does not block the local professional workflow.

## What V0.41 adds

### Template Center

- searchable template center;
- category filtering;
- search by template id, code, name, Chinese name and tags;
- direct creation from the current V0.32 template catalog;
- explicit free-access copy.

Initial catalog exposed through this flow:

- Side Seal / RSC;
- Mailer 150010;
- FEFCO 0427;
- Reverse Tuck End;
- Auto-lock Bottom.

### Pacdora-style structural generator

The Structure mode panel now presents a generator workflow instead of only raw legacy fields:

- Inner / Manufacturing / Outer dimension modes;
- all three dimension results displayed together;
- L / W / H in millimetres;
- visual material cards;
- flute selection;
- thickness override;
- Apply & Generate as a single structural commit/rebuild action.

### Packform-style interaction additions

- persistent Fold strip near the canvas;
- Assembly / 2D↔3D review entry;
- Design Scope controls: Single Face / Multi Face / Full Dieline;
- recent-project shortcut;
- Template Center shortcut in the professional top bar.

## Free-access contract

The browser exposes:

```js
window.BoxStudioV41.freeAccess === true
window.BoxStudioV41.approvalRequired === false
```

The normal editor shell hides approval-oriented controls and keeps Preflight as a quality gate rather than a human approval gate.

## Compatibility

V0.41 is an interaction convergence layer on top of existing production capabilities. It does not replace:

- V0.32 parametric geometry;
- V0.34 Marks Studio;
- V0.35 2D↔3D review;
- V0.38 Dieline CAD;
- V0.39 rebuilt topology / Full Production PDF.

The purpose is to make those capabilities reachable through a more coherent Pacdora/Packform-inspired workflow.

## Current acceptance result

The V0.41 real-Chrome workflow passed on run #6:

```text
PASS template=fefco-0427 mode=external material=corrugated-kraft fold=55
```

The same head also passed the existing CI, Hosted, PostgreSQL, V0.38, V0.39 and V0.40 workflows.

## Still not complete

The reference UX convergence is not finished. Highest-value remaining gaps are:

1. template detail/generator page with richer structural preview before entering the editor;
2. better real template thumbnails rather than symbolic placeholders;
3. drag-adjustable structural dimensions;
4. R/corner radius and box-specific flap/taper/relief/notch/shoulder controls where structurally valid;
5. explicit Front / Back / Left / Right / Top / Bottom face tabs;
6. resizable/collapsible inspector and stronger object property hierarchy;
7. richer material preview thumbnails;
8. smoother assembly animation/ground orientation controls;
9. more production-grade parametric templates toward the original 20–30 high-frequency target;
10. deeper Image/Artwork placement workflow in the unified shell.
