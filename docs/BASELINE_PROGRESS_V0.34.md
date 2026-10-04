# BoxStudio V0.34 — Marks Studio Progress

**Date**: 2026-10-04  
**Baseline**: `docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**Scope**: dedicated Shipping Marks workspace, reusable mark components/blocks, variable management and conditional mark rules on top of the V0.33 production-safe flat element model.

## 1. Marks Studio

V0.34 adds a dedicated **Marks Studio** without replacing the V0.33 Professional 2D editor or the existing production pipeline.

Implemented:

- dedicated Marks Studio entry;
- panel-targeted mark editing canvas;
- mark object list and selection;
- exact X / Y / W / H / Rotation / Panel editing;
- text/template and font controls;
- barcode/QR properties;
- handling-icon properties;
- Undo / Redo session history;
- customer / mark-template / panel selectors.

## 2. Component Library

Production-safe mark components are available for:

- SKU;
- N.W. / G.W.;
- package dimensions;
- origin;
- destination;
- CRN;
- contract number;
- package notice;
- Barcode + QR;
- This Side Up;
- Fragile;
- Keep Dry;
- existing saved mark assets / custom symbols.

Components can be inserted by click or drag/drop onto a target panel. They remain ordinary existing flat primitives (`text`, `notice`, `icon`, `barcode-qr-group`, `svg-symbol`) rather than a serializer-only scene graph.

## 3. Variables

Implemented:

- variable picker;
- `{{variable}}` token insertion;
- variable usage map;
- missing-variable visualization;
- editing of project/customer variables;
- locked-variable enforcement from the active customer profile;
- usage support for text templates, barcode values and QR values.

A real CI failure exposed an implementation bug where variable insertion emitted `{{sku}` instead of `{{sku}}`. The core insertion function was corrected; the V0.34 regression now guards this path.

## 4. Reusable Blocks and Templates

Implemented built-in reusable blocks:

- Product ID;
- Shipping Core;
- Handling Icons;
- Traceability.

Also implemented:

- create a reusable block from selected mark elements;
- save custom blocks in project/browser state;
- reinsert blocks as flat mark primitives;
- save the current mark layout as a reusable custom mark template;
- existing Customer Profile + preferred Mark Template applied through one Marks Studio preset workflow.

## 5. Conditional Rules and Debugging

Component-level mark rules support:

- SHOW / HIDE effects;
- all/any condition matching in the domain model;
- Package Count and arbitrary numeric/string variables;
- Country variables;
- Customer Profile;
- Mark Template;
- Packaging Rule Profile;
- operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, contains, in-list, empty, not-empty;
- rule preview/debug traces showing field, operator, expected value, actual value and pass/fail.

Rule results are applied to element visibility. `src/panelArtwork.js` now excludes `element.hidden === true`, so a rule-hidden mark does not leak into the production artwork plan. When the rule becomes true again, the mark re-enters the production plan.

Manual hidden state is preserved separately from rule-managed hidden state.

## 6. Regression / Browser Acceptance

CI covers:

- V0.10–V0.33 regression chain;
- V0.33 real Headless Chrome interaction;
- V0.34 domain regression;
- V0.34 real Headless Chrome interaction.

The V0.34 browser flow verifies:

1. open Marks Studio;
2. insert a SKU component;
3. edit and persist a variable;
4. create a Package Count conditional SHOW rule;
5. verify the mark hides for packageCount = 1;
6. verify the mark reappears for packageCount = 3;
7. insert a reusable Handling Icons block;
8. verify professional controls are present.

Validated PR-head CI: **#437 — SUCCESS**.

## 7. Compatibility Fix

The first V0.34 CI was blocked by a V0.33 test that incorrectly required the whole site shell/package to remain exactly version 0.33. The regression was corrected to verify that the V0.33 workspace and feature assets remain present while allowing later product versions to advance.

This preserves backwards regression value without making future releases impossible.

## 8. Explicit Boundaries

Not claimed complete in V0.34:

- PNG/JPEG raster artwork placement and production readback;
- shared/server-side component libraries;
- RBAC / collaboration / multi-user persistence;
- enterprise customer-library synchronization;
- full mobile/tablet Marks Studio interaction acceptance;
- every legacy surface reflecting rule/hide state interactively;
- factory/RIP/physical-print certification.

These remain separate hardening or later enterprise/backend milestones.

## 9. Version

- package/UI version: `0.34.0`;
- V0.33 Professional 2D remains available;
- V0.34 data remains additive project/browser state;
- existing production-safe flat primitive pipeline remains authoritative.
