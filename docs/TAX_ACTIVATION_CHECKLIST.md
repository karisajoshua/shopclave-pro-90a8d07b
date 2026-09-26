# Barakaz Tax Activation Checklist

Status: **NOT ACTIVE.** Engine at `supabase/functions/_shared/tax.ts` is code-only; checkout, create-order and Stripe are unchanged. Draft SQL in `docs/tax/migrations-draft/` is not applied.

Policy decision: Barakaz collects and remits tax as the marketplace operator for all marketplace orders.

Scope: all 13 Canadian provinces/territories. The engine SUPPORTS GST, HST, PST (BC/SK), RST (MB) and QST (QC). Support is not the same as a verified registration.

## Registration status (engine record: `REGISTRATION_STATE` in tax.ts)
- [x] **GST/HST: stated_unverified, effective 2026-09-25 (user-stated).** Tax points before 2026-09-25 fail closed (`registration_not_effective`).
  - [ ] Pending: CRA documentation confirming number and effective date; set status to `verified`.
- [ ] **BC PST, QC QST, MB RST, SK PST: `unknown`.** User has not confirmed registration. Engine fails closed (`unregistered:<P>:<TAX>`) in BC, QC, MB, SK.
  - [ ] BC PST: registration as marketplace facilitator; PST on delivery charges.
  - [ ] QC QST: registration (specified/general), marketplace obligations; QST on shipping.
  - [ ] MB RST: registration requirement for online marketplace; RST on shipping.
  - [ ] SK PST: marketplace facilitator registration; PST on shipping.
- Activation: `configFromRegistrations()` only includes `verified` keys by default; `stated_unverified` requires an explicit admin opt-in; `unknown` is never included. Future admin configuration = the `tax_registrations` table in the draft migration (not applied).

## GST/HST-only activation path
The engine supports activating with **federal components only** and fails closed elsewhere: configure `registrations = {"GST","HST"}` (no provincial keys). Then:
- AB, NT, NU, YT (GST 5%) and ON, NS, NB, NL, PE (HST) calculate normally.
- BC, MB, SK, QC return `{ ok: false, reason: "unregistered:<P>:<PST|RST|QST>" }` → no tax quote → no checkout charge in those provinces.
- Even under GST/HST-only activation, the shipping-taxability flags for GST/HST still need advisor sign-off before charging tax on shipping.
- Activation is per-environment config; provincial components switch on later by adding their registration keys once confirmed — no engine change required.
## Advisor confirmations (still blocking)
- [ ] Non-resident vendors vs Canadian vendors — any differing treatment.
- [ ] Product category mapping (taxable / zero-rated / exempt) for each Barakaz category, including provincial PST exemptions (children's clothing, books, etc. differ by province).
- [ ] Shipping rule: engine pro-rates shipping to taxable goods; each `shippingTaxable` flag must be confirmed per province/component.
- [ ] Place-of-supply basis: destination province from delivery address.
- [ ] Tax point date (order date vs payment date).
- [ ] Rounding method (engine: half-up per line per component).
- [ ] Returns/refunds: tax reversal on partial/full refunds, credit notes, reporting period adjustments.
- [ ] Invoice/receipt requirements (registration numbers, component breakdown).

## Engineering before activation
- [ ] Apply draft migration (reviewed), seed `tax_rates` + approved `tax_registrations`.
- [ ] Admin-only product `tax_category` classification; guard triggers block vendor edits. Default `unknown` blocks checkout.
- [ ] create-order computes tax server-side with the engine, writes snapshot, totals atomic.
- [ ] Stripe session line items include tax; amount equality to the cent verified.
- [ ] Checkout review displays component breakdown returned by server only.
- [ ] Refund flow reverses tax proportionally; remittance report reconciles.
- [ ] Emails/receipts show tax components.
- [ ] Stripe test-mode end-to-end per province before live.

## Fail-closed behaviour (by design)
Unknown category, unknown province, non-Canadian destination, missing rate for date, or missing registration → no tax quote → no checkout charge.
