# BoxStudio V0.43 — Native Curved Production Geometry

## Status

V0.43 closes the V0.42 corner-radius limitation by moving curved structure from metadata/UI intent into native production geometry.

The design rule is now:

- the document model keeps native line / arc / cubic records;
- CAD and export consumers read the same native records;
- 3D/topology may sample curves only when rebuilding polygonal mesh/faces;
- production SVG/DXF/PDF must not silently replace a native curve with a visual-only rounded corner or a dense LINE approximation unless an explicit compatibility mode is requested.

## Delivered

### 1. Native curve geometry core

`src/curvedGeometryV43.js` provides shared curve math for:

- cubic evaluation and sampling;
- geometric cubic fillets;
- SVG elliptical-arc center resolution;
- SVG arc to one-or-more cubic Bézier conversion;
- detection of circular arcs that can remain DXF `ARC` entities;
- curve validation/diagnostics.

### 2. Production corner radius

For the V32 engineering-core structures, `cornerRadius` now produces real CUT curves on supported tuck free corners:

- FEFCO 0427 — lid tuck;
- Reverse Tuck End — top-front and bottom-back tuck;
- Auto-lock Bottom — top-front tuck.

The requested radius is clamped to the available adjacent segment lengths. The line portions are shortened to the tangent points and a native cubic fillet is inserted between them.

V0.42 compatibility metadata is preserved so historical tests/consumers continue to see the old V0.42 contract. V0.43 reports the real production capability separately:

`advancedV43.cornerRadiusMode = production-native-cubic`

### 3. Dieline CAD preservation

`dielineDocumentFromGeometryV38()` already had native CAD edge types. V0.43 makes the production path consistently use them:

- `line`
- `cubic` with C1/C2 handles
- `arc` with RX/RY/rotation/largeArc/sweep

The V0.43 Inspector surfaces the complete arc parameter set, including rotation, sweep and large-arc state.

### 4. Native SVG

Dieline SVG keeps the original path semantics:

- Line → `L`
- Arc → `A`
- Cubic → `C`

The document is tagged with the V0.43 native curve serializer.

### 5. Native DXF

DXF now defaults to production-native curve entities:

- Line → `LINE`
- circular Arc → `ARC`
- cubic Bézier → cubic `SPLINE`
- non-circular / rotated SVG elliptical Arc → cubic `SPLINE` segments

An explicit `curveMode='flatten'` remains available only as a compatibility mode.

### 6. Native Dieline PDF

Dieline PDF no longer turns structural curves into many line segments. It emits native PDF cubic `c` operators while preserving the existing spot-color separation resources.

PDF has no SVG-style elliptical-arc primitive, so Arc records are converted mathematically into one or more cubic Bézier segments. This is native PDF vector curve output, not line flattening.

### 7. Native final Production PDF

The historical integrated Production PDF renderer flattened structural curves inside `drawDielines()`.

V0.43 adds an opt-in `nativeStructuralCurves` path to the established V0.23/V0.27 renderer, and `productionPdfV43.js` enables it after the V0.39 topology/preflight context is built.

This means the final combined output can contain:

- artwork;
- marks;
- barcode/QR;
- spot CUT/CREASE/PERF/GLUE;
- native structural cubic commands.

Older version paths keep their previous default serializer behavior so historical output-regression tests remain stable.

### 8. Topology / 3D policy

V0.39 topology continues to consume the same CAD document. Native curves are sampled only at the topology/mesh reconstruction boundary.

The source document still retains native curves, so sampling for 3D does not destroy the production curve representation used by SVG/DXF/PDF.

### 9. V0.43 Preflight

V0.43 adds checks for:

- invalid cubic handles;
- invalid Arc geometry;
- unsupported curve records;
- requested production radius failing to generate native CUT curves;
- native curve preservation in the CAD document.

### 10. UI / interaction

V0.43 upgrades the V0.42 corner-radius control from the old metadata-only warning to a NATIVE production state.

The CAD Arc Inspector now exposes:

- RX
- RY
- rotation
- sweep
- large arc

A browser lifecycle defect found during E2E was also fixed: reopening CAD after an arc edit now restores SVG edge selection with a real `MouseEvent`, so the Arc Inspector remains available after persistence.

## Compatibility

V0.43 deliberately keeps the following stable:

- V0.42 advanced-structure metadata contract;
- V0.38 CAD document schema;
- V0.39 topology workflow;
- old production-PDF serializer defaults unless V0.43 explicitly enables native structural curves.

This is why all earlier workflow gates can run unchanged beside the V0.43 gate.

## Known boundaries

V0.43 does **not** claim external tooling acceptance. These remain external validation tasks:

- CAD/CAM import in representative die-cutting software;
- real RIP/spot-color validation;
- physical die/knife sample;
- printer/tooling-house acceptance of the generated SPLINE/ARC choices.

Curved-edge delete-node merge remains fail-closed in the V0.38 CAD core; users can convert/reshape the curve instead of silently merging incompatible curve semantics. This is an explicit editor limitation, not a production-export limitation.
