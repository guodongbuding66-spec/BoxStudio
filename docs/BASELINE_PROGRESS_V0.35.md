# BoxStudio Baseline Progress — V0.35

Date: 2026-10-04

## Scope

V0.35 adds a linked 2D ↔ 3D review surface on top of the existing parametric dieline, artwork-plan, fold-graph, texture-proof, and V0.32 material models. It does not replace the production PDF pipeline or the existing proof renderer.

## Completed

### 1. Linked 2D ↔ 3D Review Workspace

- Fullscreen split review surface launched from the existing 3D area.
- Shared review state stores selected panel, selected artwork object, selection source, split preference, sync mode, and live revision.
- 2D panel click updates:
  - V0.35 selected panel
  - V0.33 `Panel Focus`
  - mark-editor panel context
  - 3D selected-face highlight
- 3D face click updates the same shared panel state and returns focus to the matching 2D panel.
- Switching panels clears an artwork-object selection that belongs to the previous panel, preventing stale cross-panel edits.

### 2. Exact Artwork Review + Near-live 3D Refresh

- Linked panel object list.
- Exact X / Y / W / H / rotation editing.
- Text/template/font editing for text/notice primitives.
- Barcode and QR value editing for barcode/QR groups.
- Exact edits reuse the V0.33 editor state path rather than creating a review-only shadow scene graph.
- Artwork changes increment `reviewV35.liveRevision` and trigger a debounced 3D texture-proof refresh.

### 3. Interactive 3D Artwork Proof

The existing software texture proof remains the rendering base and now adds:

- selected-face highlight;
- panel hit testing;
- 3D panel-selection callback;
- controller API for selected panel;
- safe pointer-capture fallback;
- material-dependent face/edge appearance;
- thickness-derived edge emphasis.

A real browser bug was found during V0.35 E2E: the proof renderer originally compared CSS pointer coordinates against internal logical canvas coordinates. When CSS resized the canvas, visible faces could be clicked but not hit-tested. V0.35 now maps CSS client coordinates back into the logical canvas coordinate system before polygon hit testing. The regression is locked by both source assertions and a real browser pointer test.

### 4. Fold Direction / Dependency Diagnostics

V0.35 derives a review sequence from the current fold graph and exposes:

- step number;
- parent → child panel dependency;
- fold angle;
- positive / negative / flat direction classification;
- physical vs fallback hinge indication.

Fail-closed diagnostics include:

- edge references missing node;
- missing hinge;
- fold angle outside ±180°;
- multiple fold parents;
- graph with panels but no root;
- configured root missing from graph;
- cycle detection.

Warnings include:

- fallback/inferred hinge;
- 0° fold edge;
- panels outside the current root traversal.

The UI now distinguishes `GRAPH OK`, `GRAPH OK · N WARNINGS`, and `CHECK GRAPH`.

### 5. Material / Flute / Thickness Review

V0.35 exposes the V0.32 engineering material model inside the linked review workspace:

- White Corrugated
- Brown Kraft Corrugated
- SBS Paperboard
- Kraft Paperboard
- Greyboard
- corrugated flute choices
- explicit thickness override

The 3D review uses material appearance families for review-only board face/edge rendering and derives edge emphasis from material thickness.

## Validation

### Domain regression

`tests/v35.mjs` verifies:

- review-state initialization;
- 3D → 2D panel state synchronization;
- 2D object selection integration with the V0.33 selection model;
- exact artwork edits and live revision increments;
- stale cross-panel selection clearing and stale-edit blocking;
- material / flute / thickness resolution;
- fold progress clamping;
- fold sequence generation;
- cycle, missing hinge, and missing root fail-closed behavior;
- presence of the CSS-scaled canvas hit-test coordinate conversion.

### Real browser regression

`tests/v35-browser-e2e.js` runs in real Headless Chrome and verifies:

1. opening the V0.35 review workspace;
2. 2D dieline + 3D proof rendering;
3. locating a real rendered paperboard-face pixel on the 3D canvas;
4. dispatching actual pointer down/up events to that visible face;
5. 3D → 2D panel-focus synchronization;
6. 2D panel selection persistence;
7. real artwork-object selection and exact geometry editing;
8. material / flute / thickness persistence;
9. fold-progress persistence and active proof update;
10. explicit fold-sequence boundary disclosure.

## Bugs found and fixed during V0.35

1. **3D hit-test CSS/logical coordinate mismatch**
   - Symptom: a visibly rendered face could be clicked but no panel was selected.
   - Root cause: hit testing compared CSS client coordinates with logical canvas projection coordinates.
   - Fix: convert client coordinates to the renderer logical coordinate system before polygon testing.

2. **Stale artwork object after panel switch**
   - Symptom: review state could show one panel while retaining an object ID from another panel.
   - Fix: clear incompatible object selection and V0.33 selection when the linked panel changes; stale exact edits are blocked.

3. **Missing fold root was not fail-closed**
   - Symptom: a graph containing panels but no root could otherwise degrade into only traversal warnings.
   - Fix: `ROOT_REQUIRED` is now an ERROR.

4. **Browser E2E initially guessed click locations**
   - Symptom: fixed canvas fractions did not guarantee a visible face hit.
   - Fix: the test now scans the actually rendered canvas and targets a verified paperboard-face interior pixel before sending pointer events.

## Explicit boundaries / not claimed complete

V0.35 does **not** claim:

- factory machine folding sequence or tooling instructions;
- physical bend radius, score geometry, board compression, spring-back, or print-stretch compensation;
- ICC/color-managed 3D soft proof;
- physical substrate color calibration;
- photorealistic/WebGL/PBR rendering;
- factory sample validation of folded appearance.

The displayed fold order is a graph/dependency review sequence only.

## Next logical milestone

A following milestone should focus on production workflow infrastructure rather than adding more review-only controls: immutable project/revision snapshots, server persistence/auth/RBAC, publish/approval state, and durable audit/search around the now-mature editor + proof surfaces.
