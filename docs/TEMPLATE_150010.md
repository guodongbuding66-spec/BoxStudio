# Mailer / Flip-top Model 150010 — V0.6 calibration note

V0.6 retains a second parameterized template named `mailer-150010`.

Public model-150010 reference used only as dimensional/structural calibration:

- Inside dimensions: 300 × 200 × 60 mm
- Outside dimensions: 316 × 204.5 × 63 mm
- Manufacture dimensions: 315 × 202 × 62 mm
- Material: E-flute paper
- Thickness: 1.5 mm
- Design area: 576 × 590 mm
- Model ID: 150010

Public reference PDF observed during development:
`https://packlegacy.com/wp-content/uploads/2025/03/Mailer-Box-Dieline.pdf`

Pacdora also publicly describes model 150010 as a custom-dimensions flip-top / mailer dieline. BoxStudio does not copy Pacdora's UI, artwork or proprietary implementation. V0.6 continues its own simplified parameter generator and fold graph.

## V0.6 panel semantics

- `base`
- `front`
- `back`
- `left`
- `right`
- `lid`
- `lid-tuck`
- `left-wing`
- `right-wing`
- lid side flaps
- front/back tabs

For the reference 300 × 200 × 60 mm values, the current parameter generator intentionally evaluates to a 576 × 590 mm design area. This is a calibration target, not a claim that every curve, lock notch, allowance, or converter compensation is production-identical to another vendor's dieline.
