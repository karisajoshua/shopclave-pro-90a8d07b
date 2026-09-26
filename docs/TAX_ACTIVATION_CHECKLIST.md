# Barakaz Tax Activation Checklist

Status: **NOT ACTIVE.** Engine at `supabase/functions/_shared/tax.ts` is code-only; checkout, create-order and Stripe are unchanged. Draft SQL in `docs/tax/migrations-draft/` is not applied.

Policy decision: Barakaz collects and remits tax as the marketplace operator for all marketplace orders.

## Registration status (user-confirmed)
- [x] **GST/HST registered.** Barakaz holds a GST/HST registration (marketplace-operator obligations, Excise Tax Act platform rules since 2021).
  - [ ] Pending: exact effective date of registration — needed to reject/accept tax points before it; until supplied, activation uses date-gated rates only and must not backdate obligations.
  - [ ] Pending: CRA validation of the registration number for display on invoices/receipts.
- [ ] **Provincial registrations: status UNKNOWN — do not assume.**
  - [ ] BC PST: registration as marketplace facilitator; PST on delivery charges.
  - [ ] QC QST: registration (specified/general), marketplace obligations; QST on shipping.
  - [ ] MB RST: registration requirement for online marketplace; RST on shipping.
  - [ ] SK PST: marketplace facilitator registration; PST on shipping.

## GST/HST-only activation path
The engine supports activating with **federal components only** and fails closed elsewhere: configure `registrations = {"GST","HST"}` (no provincial keys). Then:
- AB, NT, NU, YT (GST 5%) and ON, NS, NB, NL, PE (HST) calculate normally.
- BC, MB, SK, QC return `{ ok: false, reason: "unregistered:<P>:<PST|RST|QST>" }` → no tax quote → no checkout charge in those provinces.
- Even under GST/HST-only activation, the shipping-taxability flags for GST/HST still need advisor sign-off before charging tax on shipping.
- Activation is per-environment config; provincial components switch on later by adding their registration keys once confirmed — no engine change required.
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
