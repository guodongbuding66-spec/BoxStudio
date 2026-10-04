# BoxStudio V0.32 — Parametric Template Core Progress

**Date**: 2026-10-04  
**Baseline**: `docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**Scope**: restore the product mainline to paper-box design first: Template Center + parametric structure core.

## 1. What V0.32 closes

V0.32 turns the template area from “two implemented structures plus schema placeholders” into a five-template parametric core.

Core templates:

1. `side-seal-rsc` — FEFCO 0201 / RSC base;
2. `mailer-150010` — Flip-top Mailer 150010;
3. `fefco-0427` — roll-end tuck-top / self-lock mailer engineering core;
4. `reverse-tuck-end` — reverse tuck-end folding carton engineering core;
5. `auto-lock-bottom` — crash-lock / auto-lock bottom folding carton engineering core.

The first two keep their existing V0.31 geometry implementation. The three new templates use V0.32 deterministic geometry engines.

## 2. Compatibility architecture

The V0.31 geometry implementation is preserved byte-for-byte as:

`src/geometryLegacyV31.js`

`src/geometry.js` is now a compatibility bridge:

- existing RSC / 150010 / imported dielines delegate to V0.31 logic;
- V0.32 templates delegate to `src/parametricTemplatesV32.js`;
- the public geometry API remains compatible for existing callers.

This is intentional: V0.32 must not gain templates by destabilizing PDF, 3D, Preflight, marks or legacy imported-dieline behavior.

## 3. Parameter model

V0.32 adds explicit dimension modes:

- `internal`;
- `external`;
- `manufacturing`.

For the V0.32 engines, L/W/H are resolved into a dimension set containing:

- internal dimensions;
- manufacturing dimensions;
- external dimensions;
- board thickness;
- material information.

Thickness compensation is deterministic and participates in geometry generation.

### Boundary

These compensation equations are engineering defaults, not a claim that one universal allowance is correct for every converter, corrugator, die cutter, scoring rule or board supplier. Factory-specific allowances remain a later Factory Profile / real-sample acceptance task.

## 4. Material / flute core

Added `src/materialsV32.js` with editable engineering presets for:

- F / E / B / C / EB / BC / AA flute;
- White Corrugated;
- Brown Kraft Corrugated;
- SBS Paperboard;
- Kraft Paperboard;
- Greyboard.

A material resolves to:

- category;
- flute;
- ply;
- thickness mm;
- appearance hint;
- source (`explicit` or `engineering-preset`).

Explicit user thickness overrides the engineering preset.

## 5. Template Center

Added a V0.32 Template Center UI with:

- search by name / code / tag;
- category filtering;
- generated dieline preview from the actual geometry engine;
- core/ready state;
- default dimensions;
- “create from this template” flow;
- direct creation into the existing BoxStudio Editor.

The preview is generated from CUT / CREASE vectors. It is not a static marketing thumbnail.

## 6. Project presets

`stateForTemplate()` now supports all five core templates.

- 0427 reuses compact mailer-oriented mark placement;
- RTE / Auto-lock use compact folding-carton mark placement;
- all initial mark `panelId` values are regression-checked against the generated panel map.

Storage moves to `boxstudio-mvp-v32`, while `boxstudio-mvp-v31` remains a migration source.

## 7. Honest validation status

### Regression-ready

- FEFCO 0201 / RSC existing engine;
- Mailer 150010 existing engine;
- all five templates have deterministic software regression;
- L/W/H parameter changes regenerate vectors;
- board thickness affects compensated manufacturing dimensions;
- all five can be created as Editor projects.

### Engineering core, not yet factory tooling-certified

The new 0427, Reverse Tuck End and Auto-lock Bottom structures are intentionally marked:

`engineering-core-pending-real-sample`

Before production tooling release they still need:

- real CAD/dieline overlay;
- sample dimensions measured at crease centers;
- board/caliper compensation validation;
- lock/tuck clearances checked against physical board;
- actual folding sample;
- converter/factory confirmation where applicable.

The software must not convert this status into “factory certified” without that evidence.

## 8. V0.32 acceptance gates

The dedicated V0.32 regression verifies:

- exactly five actionable core templates exist;
- legacy schema-only namespaces remain discoverable but non-actionable;
- each core template has defaults and generates actual geometry;
- body panels, CUT, CREASE, panel map, bleed/safe data exist;
- repeated generation is deterministic;
- every default mark points to a real panel;
- 0201 and 150010 preserve known V0.31 identity/reference behavior;
- 0427 models roll-wall/tab structure rather than a static rectangle;
- RTE has opposite top/bottom tuck relationships;
- Auto-lock has diagonal lower pre-folds;
- L/W/H changes recalculate blank dimensions and cut vectors;
- thickness changes affect compensated dimensions;
- internal/external/manufacturing modes resolve distinctly;
- Template Center resources and V0.32 storage/version are registered.

## 9. What V0.32 does not close

V0.32 does **not** claim completion of:

- 20–30 box template library;
- full material database / factory profiles;
- production-certified 0427/RTE/Auto-lock compensation;
- professional 2D editor UX completeness;
- full Dieline CAD authoring;
- 2D ↔ 3D bidirectional selection;
- full Preflight;
- Browser Interaction E2E;
- real CAD / printer / factory sample acceptance.

Those remain visible in the current unfinished audit.

## 10. Next mainline target

**V0.33 — Professional 2D Editor**

Priority areas:

- complete image/icon/table tools;
- layers UX;
- true arbitrary Group/Ungroup;
- selection clipboard / copy-paste;
- unified Undo/Redo coverage;
- stronger rulers/guides/snapping UX;
- panel-focused editing;
- object properties and precision transforms;
- browser interaction regression for core edit operations.
