# Barakaz Tax Activation Checklist

Status: **NOT ACTIVE.** Engine at `supabase/functions/_shared/tax.ts` is code-only; checkout, create-order and Stripe are unchanged. Draft SQL in `docs/tax/migrations-draft/` is not applied.

Policy decision: Barakaz collects and remits tax as the marketplace operator for all marketplace orders.

## Legal / tax advisor must confirm (blocking)
- [ ] GST/HST registration number and marketplace-operator obligations (Excise Tax Act, platform rules since 2021).
- [ ] BC PST: registration as marketplace facilitator; PST on delivery charges.
- [ ] QC QST: registration (specified/general), marketplace obligations; QST on shipping.
- [ ] MB RST: registration requirement for online marketplace; RST on shipping.
- [ ] SK PST: marketplace facilitator registration; PST on shipping.
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
