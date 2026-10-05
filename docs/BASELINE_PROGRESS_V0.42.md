# BoxStudio V0.42 — Template Detail + Advanced Structure Controls

## Status

V0.42 moves BoxStudio beyond the V0.41 template/generator shell and adds a first manufacturability-aware advanced-structure layer.

This release keeps the product baseline unchanged:

- browser-first packaging design workflow;
- true millimeter structure model;
- 2D dieline + artwork + 3D fold review;
- core design workflow free to use;
- no default approval/role gate;
- no watermark/paywall requirement in the default workflow;
- do not claim production geometry that the engine does not actually emit.

## Delivered

### 1. Template Detail

Template Center cards now expose a separate **Details** affordance before project creation.

The detail view shows:

- template standard/code/name/status;
- a dieline preview generated from the real BoxStudio geometry engine;
- an assembly silhouette based on the current L/W/H;
- semantic panel inventory;
- current dimensions and thickness;
- advanced-structure capability status;
- explicit capability warning where a requested control is not yet production geometry.

This follows the reference workflow principle of inspecting/configuring a template before entering the full editor, without copying third-party visual assets or branding.

### 2. Advanced structure model

The V32 engineering-core structures now normalize and persist:

- `flapTaper` — 0..30 mm
- `notch` — 0..25 mm
- `shoulder` — 0..30 mm
- `relief` — 0..20 mm
- `cornerRadius` — 0..30 mm

All default to zero so existing V0.32–V0.41 projects keep their previous geometry unless the user explicitly enables an advanced control.

### 3. Real CUT geometry changes

Advanced controls are applied at the unified `generateGeometry()` boundary after the stable template generator and before guides/export consumers.

Supported in V0.42:

#### FEFCO 0427

- flap taper modifies the lid tuck free-edge geometry;
- finger notch emits a centered notch as CUT segments;
- lock shoulder emits paired retention/shoulder CUT segments;
- fold relief emits corner relief CUT segments around the base/roll-end structure.

#### Reverse Tuck End

- taper/notch/shoulder modify both the top-front tuck and bottom-back tuck.

#### Auto-lock Bottom

- taper/notch/shoulder modify the top-front tuck while preserving the existing lower crash-lock construction.

The modified tuck panel also receives semantic polygon `points`, so downstream preview/editor code can inspect the changed panel shape rather than seeing a UI-only parameter.

### 4. Corner radius — deliberately not overstated

`cornerRadius` is persisted and surfaced in the structure model, but V0.42 reports:

`cornerRadiusMode = metadata-only-line-engine`

and the public UI capability flag remains:

`cornerRadiusProductionArc = false`

Reason: the current V32 production generator still represents these structures primarily as line segments. V0.42 does **not** fake rounded production corners with visual CSS/SVG decoration and does not claim ARC/Cubic output until that production path is implemented and validated.

### 5. 2D semantic panel labels

The Design canvas adds UI-only semantic labels for body panels such as:

- BASE
- BACK WALL
- LID
- FRONT WALL
- LEFT OUTER WALL
- RIGHT OUTER WALL

These labels are editor assistance and do not contaminate production artwork/export layers.

### 6. Fold / Assembly controls

The persistent Fold strip now adds:

- 0%
- 50%
- 100%
- Play Assembly

The first browser implementation used `requestAnimationFrame`; headless acceptance exposed that virtual-time scheduling could leave persisted fold state part-way through the animation. The implementation was changed to deterministic timed increments with an explicit final `100` persistence step.

### 7. Inspector usability

The right Inspector / 3D deck now supports:

- drag resize, persisted locally;
- collapsible panel sections;
- compatibility with both current legacy `h3` headings and newer `h4` headings;
- heading remains visible after collapse.

### 8. Material presentation

Existing material cards now use original CSS-generated board-like swatches for kraft/grey/white materials. No third-party textures are copied.

## Regression principle

V0.42 advanced geometry is opt-in. When all advanced values are zero:

- the stable V0.32 template generator remains the source geometry;
- no V0.42 advanced CUT edits are applied;
- existing V0.38/V0.39 production/export behavior should remain unchanged.

## Next production gap

The largest intentional gap after V0.42 is **true ARC/Cubic production geometry** for corner radius and related curved structural features. That should be addressed before calling rounded-corner tooling production-ready.
