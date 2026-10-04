# BoxStudio Baseline Progress V0.31

**Date**: 2026-10-04  
**Baseline**: `在线唛头网站_开发文档_V1.0.md` / `V2.0_开源项目调研版.md` / `V3.0_集百家之长终版.md`

## Closed or materially advanced in V0.31

### 1. Barcode / QR Digital Decode Required Check

V3 required a digital verification step after production generation rather than only trusting the encoder.

V0.31 adds `src/digitalDecodeV31.js` and reads the generated V0.27 Production PDF artifact itself:

1. parse the PDF vector rectangle primitives used by Barcode / QR;
2. isolate Barcode and QR regions from the actual code-block geometry;
3. rasterize those artifact primitives in memory;
4. decode the rasterized barcode / QR;
5. compare the decoded result with the configured source value;
6. return a blocking error when the round trip fails.

Covered barcode routes:

- Code 39;
- EAN-13;
- UPC-A;
- ITF-14;
- GS1-128 Code128-B/FNC1 codeword round trip.

QR coverage follows the current built-in QR scope: Version 1-4, error correction L, byte mode.

This is now a **digital Production PDF artifact check**. It is still not a substitute for physical scanner verification or ISO barcode print-quality grading.

### 2. Preview / PDF Geometry Acceptance

V3 PoC E defined a target of `<= 0.2 mm` for key Preview/PDF positions.

V0.31 adds `src/geometryAcceptanceV31.js`:

- reads the generated Production PDF bytes;
- extracts MediaBox, stroked rectangles, text anchors and line coordinates;
- builds the expected Preview probes from the mm geometry model;
- compares page size, core mark rectangles, text anchors, artwork lines and dieline lines;
- reports probe count, failed count and maximum coordinate error;
- uses the project tolerance, default `0.2 mm`.

Cross-panel appearance pixels and outlined glyph shapes remain covered by their serializer-specific regression paths rather than by this key-point coordinate probe.

### 3. Required-check integration

`src/preflightV31.js` wraps the existing preflight and adds two required checks:

- `DIGITAL_DECODE_V31`;
- `PREVIEW_PDF_GEOMETRY_V31`.

Production Job creation/revision and batch preflight now use the V0.31 wrapper, so a required-check failure becomes a preflight error instead of a passive diagnostic.

### 4. UI / export gate

`src/v31Ui.js` adds a Production Acceptance workspace with:

- Run Required Checks;
- Export Checked PDF;
- Export Approved Checked PDF;
- Digital Decode PASS/FAIL;
- Geometry PASS/FAIL and max-error display.

The older V0.27 direct Production buttons are hidden by the V0.31 UI stylesheet so the current visible path requires V0.31 acceptance.

## Still not closed by V0.31

- external PDF renderer / RIP raster acceptance;
- physical scanner / ISO barcode grade;
- current US real-sample overlay acceptance report;
- third-party PDF/X certification;
- browser interaction E2E;
- Production Bundle + SHA-256 + immutable snapshot;
- hosted backend / Auth / RBAC / server audit;
- Master Data / Content Library;
- workflow / compare / enterprise integrations.

## Next baseline target

`V0.32 — Production Bundle + SHA-256 + immutable snapshot schema`.
