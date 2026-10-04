# BoxStudio V0.33 — Professional 2D Editor Progress

**Date**: 2026-10-04  
**Baseline**: `docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**Scope**: move BoxStudio from a functional single-object canvas toward a professional packaging artwork editor while keeping the V0.10–V0.32 production chain intact.

## 1. Architecture

V0.33 does not replace the stable legacy editor or rewrite the existing export stack.

It adds a dedicated **Professional 2D** workspace entered from Design / Marks. The workspace:

- reads the same Project state;
- writes the same Project state;
- has its own interactive selection/history session;
- saves back to the existing browser project;
- exits back to the existing Structure / 3D / Preflight / Export workflow.

The goal is to increase editing capability without destabilizing the geometry, 3D, PDF or preflight code already covered by regression tests.

## 2. Object editing core

Added `src/editorCoreV33.js` as a UI-independent object-editing core.

Implemented:

- single and additive multi-selection;
- group-aware selection;
- arbitrary Group / Ungroup metadata;
- Copy / Paste;
- Duplicate;
- Delete;
- Bring to Front / Send to Back;
- Bring Forward / Send Backward;
- deterministic z-index normalization;
- Align Left / Center / Right / Top / Middle / Bottom;
- horizontal / vertical distribution;
- keyboard/numeric translation;
- exact property update;
- object Lock / Hide editor state;
- Artwork / Marks / Dieline layer visibility and lock state;
- Panel Focus / Fit All.

Groups deliberately remain a flat list plus `groupId` metadata. Existing production serializers therefore continue to consume the same element primitives instead of requiring a new nested scene graph.

## 3. Professional workspace

Added `src/v33Ui.js` + `src/v33Ui.css`.

The workspace includes:

- professional toolbar;
- left object tool rail;
- SVG/mm design canvas;
- object selection boxes;
- resize handle;
- rotate handle;
- Transform inspector;
- exact `X / Y / W / H / R` input;
- Panel selector;
- Align / Distribute panel;
- Layers panel;
- Objects list;
- per-object Lock / Hide;
- Panel Focus selector;
- Fit All;
- Undo / Redo session history;
- keyboard shortcuts and 1 mm / 10 mm nudge.

Keyboard shortcuts:

- `Ctrl/Cmd + Z` — Undo;
- `Ctrl/Cmd + Y` — Redo;
- `Ctrl/Cmd + C` — Copy;
- `Ctrl/Cmd + V` — Paste;
- `Ctrl/Cmd + D` — Duplicate;
- `Ctrl/Cmd + G` — Group;
- `Shift + Ctrl/Cmd + G` — Ungroup;
- `Delete / Backspace` — Delete;
- Arrow keys — 1 mm nudge;
- Shift + Arrow — 10 mm nudge.

## 4. Table tool

V0.33 adds a Table tool without inventing a serializer-only custom object.

A table is flattened to existing production-safe primitives:

- one shape border;
- horizontal/vertical line objects;
- text objects for cells;
- one shared `groupId`.

This means the same table content enters the existing artwork plan and native production serializers as ordinary vectors/text.

## 5. Image tool boundary

V0.33 enables **SVG vector artwork import** as the first production-safe Image path.

It reuses the existing sanitized SVG mark pipeline:

- parse SVG;
- reject unsafe/external references according to existing parser rules;
- convert to `svg-symbol`;
- place on a panel;
- carry into the existing production artwork plan.

### Not claimed complete

PNG/JPEG raster placement is **not** marked production-ready in V0.33. The current native PDF/SVG/3D path does not yet have one verified raster-image embedding contract covering resolution, color profile, transparency and final-production readback.

## 6. Regression findings during development

The implementation was not accepted on first pass.

Three failures were found and corrected:

1. A V0.32 regression assertion accidentally treated schema-only FEFCO/ECMA namespace entries as actionable engines. The test was corrected so the five real engines are checked separately while schema placeholders remain required.
2. V0.33 Z-order initially rebuilt the requested order and then sorted again by stale `zIndex`, undoing Bring-to-Front/Back. The core was corrected to **reindex the requested final array order without re-sorting it**.
3. The V0.33 shell initially observed the whole `documentElement` and unconditionally rewrote `document.title`. That title mutation retriggered the `MutationObserver`, creating a microtask starvation loop in a real browser. The observer is now scoped to `#app`, and title/version text are written only when their value actually changes.

These failures are retained as evidence that the CI gates are detecting real mistakes rather than only exercising happy paths.

## 7. Browser interaction regression

V0.33 adds a Headless Chrome browser fixture using the actual V0.33 UI module and project state. It performs real DOM interaction:

1. load the V0.33 UI module;
2. require the Professional 2D entry;
3. open the V0.33 workspace;
4. select an object;
5. Duplicate it;
6. edit X to `77` through the numeric inspector;
7. verify the persisted Project element changed to X = `77`;
8. add a Table;
9. verify the flattened table primitives were persisted;
10. require the Professional controls and Panel Focus to exist;
11. signal browser PASS to the CI fixture.

The Chrome process is bounded by a hard timeout so a browser background task cannot leave CI hanging. Browser PASS is a required gate rather than a warning.

### Accepted CI

- Workflow: **CI #432**
- Run ID: `37191390957`
- Head: `2e1b11bef3baf77e01ddc0bb87679c60afff9006`
- Result: **SUCCESS**
- V0.10–V0.32 regression: PASS
- V0.33 pure-state regression: PASS
- V0.33 real browser interaction regression: PASS

## 8. Remaining V0.33/editor gaps

The Professional 2D core is substantially implemented, but the following are intentionally not overstated:

- PNG/JPEG raster artwork placement;
- explicit cross-panel paste-target UX;
- marquee selection polish;
- aspect-ratio/anchor/transform-origin controls for every object type;
- top-level layer reordering semantics;
- hide/lock semantics across every legacy/export surface;
- full integration of every older cross-panel/clip/profile overlay into one history stack;
- full browser pointer drag/resize/rotate E2E matrix across all templates.

These are editor hardening items; they are separate from the V0.34 Shipping Marks component/library work.

## 9. Version

- UI/package version: `0.33.0`;
- shell title: `BoxStudio V0.33`;
- existing V0.32 project storage remains readable; V0.33 editor metadata is additive and normalized when the Professional workspace opens.
