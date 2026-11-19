# Financial Engine and Methodology

**Status:** CAPM, price-period return, listed Altman Z/X1–X5, zone and RFin base are now recomputed in `scripts/build-data.mjs` from workbook input sheets and checked against the workbook's saved formula outputs. ESG score and portfolio weights remain workbook-provided because their recomputation needs unresolved methodology and/or price history.
**Related:** [DATA.md](DATA.md), [spec data model](../specs/001-investor-due-diligence-demo/data-model.md)

## Rules for all calculations

- Implement formulas in deterministic code, with method version, inputs, units, fiscal period, source, and intermediate values returned.
- Use `null`/TODO for missing inputs. Never let an LLM infer financial values or fill gaps.
- Do not mix Altman Z, Z′, or Z″-EM coefficients/thresholds. Label each model on screen/report.
- Workbook's canonical listed-company demo decision is Altman Z (1968), zone thresholds 2.99 / 1.81, and weight bounds 15%–55%. AQ_Input v3 Z″-EM and 5%–40% bounds are a separate unreconciled methodology, not an interchangeable update.
- Maintain a methodology version and a data-quality issue for every unconfirmed source or conflicting workbook value.

## Altman Z (listed-company demo)

For listed manufacturers, with workbook-specific inputs:

```text
X1 = (Current Assets - Current Liabilities) / Total Assets
X2 = Retained Earnings / Total Assets
X3 = (EBT + Interest Expense) / Total Assets
X4 = Market Capitalization / Total Liabilities
X5 = Net Revenue / Total Assets
Z  = 1.2 X1 + 1.4 X2 + 3.3 X3 + 0.6 X4 + 1.0 X5
```

The workbook uses EBT + interest expense for X3 (a proxy; disclose this rather than calling it audited EBIT). Zone: Safe `Z > 2.99`; Grey `1.81 ≤ Z ≤ 2.99`; Distress `Z < 1.81`.

## Altman Z′ (private-company PDF)

For the existing private-company extraction flow:

```text
X1 = (Current Assets - Current Liabilities) / Total Assets
X2 = Retained Earnings / Total Assets
X3 = (EBT + Interest Expense) / Total Assets
X4 = Book Equity / Total Liabilities
X5 = Net Revenue / Total Assets
Z′ = 0.717 X1 + 0.847 X2 + 3.107 X3 + 0.420 X4 + 0.998 X5
```

Use the Z′ zones documented by the private-company methodology in code. Do not apply listed Z thresholds to Z′. Private Grey-zone RFin mapping is unresolved in `docs/DATA.md`; show missing until the data owner approves it. Validate nonzero denominators and unit consistency. PDF values need page/line citations.

## CAPM expected return

```text
Ri = Rf + βi × MRP
```

Use annual risk-free rate `Rf`, beta `βi`, and market risk premium `MRP` with source and as-of date/year. Workbook methodology currently references Rf 2.77% and ERP/MRP 8.35% from specific sources/periods; these are not universal defaults. If a required input is missing or period-incompatible, return unavailable rather than silently reusing a prior year.

## RFin base

For listed Z methodology, workbook design:

```text
Z ≥ 2.99  => RFin_base = 0.10
Z ≤ 1.81  => RFin_base = 0.70
1.81 < Z < 2.99 => linear interpolation from 0.70 down to 0.10
```

This is an internal risk mapping, not an original Altman probability. Formula between thresholds:

```text
RFin_base = 0.70 - (Z - 1.81) × (0.60 / (2.99 - 1.81))
```

Do not claim a probability of default. Clamp behavior and valid upper bound for total risk must be explicitly configured; the product must not silently clamp.

## POSINT and total financial risk

Workbook policy tiers:

| Evidence level | Example policy signal | Penalty |
|---|---|---:|
| 0 | No qualifying approved event | 0.00 |
| 1 | Media report, warning, or reminder | +0.05 |
| 2 | Verified administrative penalty decision | +0.10 |
| 3 | Prosecution, suspension, or severe event | +0.20 or approved policy value |

```text
POSINT = sum(penalty for approved, active findings)
RFin_total = RFin_base + POSINT
```

POSINT is a policy penalty, not a probability. A news article alone cannot be promoted to a formal penalty. Current MCM event details/severity are documented as a data-quality decision in `docs/DATA.md`; preserve the selected workbook interpretation and warning unless a data owner changes it.

## ESG

- Display existing ESG total as provided, with workbook source/version.
- E/S/G radar only when the relevant pillar values exist.
- `ESG_ChiTieu` disclosure counts are disclosure measures, not ESG scores. Never normalize those counts into pillar scores without an approved methodology.
- Do not derive a total or pillar from missing indicators. ESG rubric, weights, normalization, and missing-data treatment need an approved version before recomputation.

## Portfolio objective and constraints

The intended objective is:

```text
maximize F(W) = Σi wi(αRi + γESGi - δRFin_i) - β ΣiΣj wi wj σij
```

Subject to:

```text
Σi wi = 1
0.15 ≤ wi ≤ 0.55   # current four-asset PoC bounds only
```

`σij` must be calculated from aligned adjusted-price return series with common frequency/window and documented annualization. The current workbook does not provide a valid historical price series for this calculation; do not label a scenario-nearest lookup as a fresh optimizer run or invent covariance. Report infeasibility if constraints conflict. Independently validate solver output.

## Performance measures

```text
Expected portfolio return = Σi wi × Ri
Realized portfolio return = Σi wi × realized_return_i
Weighted ESG = Σi wi × ESGi   # only if every selected ESGi is comparable and available
Weighted RFin = Σi wi × RFin_total_i
Portfolio variance = Wᵀ Σ W
Portfolio volatility = sqrt(Wᵀ Σ W)
```

Every aggregate must list excluded/missing inputs and the selected time period. Do not compare portfolio realized return to a market benchmark unless the benchmark series exists.

## Current implementation boundary

- `npm run data` computes CAPM from `Params.rf`, `Params.erp`, and `Market.beta`; computes the one-period return from `price_start_next` and `price_end_next`; and recomputes listed Altman inputs from the `Financials` sheet. It fails generation if these values disagree with the workbook's formula results beyond tolerance.
- The data builder independently computes Baseline and ESG-aware weighted expected/realized returns from their workbook weights and per-company returns, validates weight totals/bounds, then checks those aggregates against `Portfolio_Summary` before exporting them.
- The displayed price return is `price_end_next / price_start_next - 1`; source values are described as 2025 prices, but the workbook/runtime payload currently lacks the dates of those two observations. It is not annualized, rolling, out-of-sample, or a live feed.
- Baseline and ESG-aware weights and their summary returns are supplied by the workbook. The UI does not rerun Markowitz/COBYLA when sliders move; it snaps to one of two saved scenarios. A one-period return difference is descriptive and cannot validate the research hypothesis by itself.
- ESGi, E/S/G pillars, approved OSINT, and portfolio weights are still source workbook values or demo records. The app must not label them as freshly computed/live.
- The OSINT LLM can propose category/severity only from provider-supplied title/excerpt text. The quote must be a literal substring of the excerpt. Reviewer action is session-local and cannot write an official score.
