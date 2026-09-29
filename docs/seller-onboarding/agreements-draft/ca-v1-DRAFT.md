# Barakaz Canadian Seller Agreements — version ca-v1 — DRAFT

**STATUS: BUSINESS TERMS PARTIALLY OWNER-CONFIRMED; LEGAL DRAFT, NOT PUBLISHED.**
Owner confirmed on 2026-09-29: retain the listed category commission rates (8–15%, 12% default) and the 7-day return window. All other [VERIFY] items remain unresolved. This confirmation is not legal review.
Must be reviewed by a qualified Canadian lawyer before it is published in `seller_policy_documents`.
Items marked **[VERIFY]** are unconfirmed facts or legal choices the owner/counsel must decide.
Numbers marked **[FROM SETTINGS]** are copied from current production settings, read on 2026-09-29.

Operator: **Barakaz Inc**, incorporated in **Alberta, Canada** [OWNER CONFIRMED 2026-09-29]; Stripe-listed company address **5308 147 Avenue NW, Unit 204, Edmonton, Alberta T5A 4J2, Canada** [VERIFIED IN STRIPE PROFILE; CONFIRM THIS IS THE LEGAL REGISTERED OFFICE], operating as "Barakaz" (barakaz.com). GST/HST registration: 784144644RT0001.
Support: support@barakaz.com [FROM SETTINGS].

---

## 1. seller_terms — Barakaz Seller Terms & Conditions

1. **Eligibility.** At launch, only sellers resident in or incorporated in Canada, shipping from a Canadian address, can sell. Seller types: individual, sole proprietor, company. [VERIFY: minimum age 18 / age of majority by province]
2. **Account and verification.** Sellers submit accurate business, identity and payout information. Barakaz reviews every application; sellers can't list products until approved and until Stripe confirms their payout account. [VERIFY: which identity documents are required]
3. **Barakaz's role.** Barakaz runs the marketplace, collects payment from buyers through Stripe, and collects and remits GST/HST as the marketplace operator. The seller is the seller of record of the goods. [VERIFY with counsel/accountant: marketplace-facilitator wording]
4. **Listings.** Sellers must describe products accurately, including real price, condition, weight and package dimensions. Barakaz may remove listings that break its policies.
5. **Suspension and termination.** Barakaz may suspend or close a seller account for policy breaches, fraud, or legal risk. Pending payouts may be held to cover refunds and chargebacks. [VERIFY: notice period, hold duration]
6. **Liability, indemnity, governing law.** [VERIFY — counsel must draft: limitation of liability, indemnity, governing province (e.g. Ontario), dispute resolution]
7. **Changes.** Barakaz may update these terms with notice; a new version needs to be accepted again. [VERIFY: notice period]
8. **Privacy.** Seller data is handled under the Barakaz Privacy Policy and PIPEDA. [VERIFY: Quebec Law 25 obligations if sellers or buyers are in Quebec]

## 2. commission_payout — Commission & Payout Terms

1. **Commission by category** [FROM SETTINGS — OWNER CONFIRMED 2026-09-29; calculation basis still requires verification]:
   Electronics 8%, Phones & Tablets 8%, Automotive 10%, Health & Beauty 12%, Home & Garden 12%, Sports & Fitness 12%, Books 15%, all other categories 12% (default).
2. **Payment processing fee** [FROM SETTINGS — VERIFY who pays it]: 2.9% + CA$0.30 per order.
3. **What commission is calculated on.** [VERIFY: item price only, or item price plus shipping; and whether tax is excluded (it should be)]
4. **Currency.** Sales and payouts are in Canadian dollars (CAD).
   Note: the platform setting `currency` still reads "KES" and `free_shipping_threshold` reads 5000. Both are legacy values, not used by CAD checkout. Correct them before launch. [VERIFY]
5. **Payouts.** Paid through Stripe Connect Express to the seller's Canadian bank account, once Stripe marks payouts as enabled. [VERIFY: payout schedule, and any reserve or hold period after delivery]
6. **Deductions.** Refunds, chargebacks and chargeback fees may be deducted from the seller's balance. [VERIFY: chargeback fee policy]
7. **Taxes on commission.** GST/HST applies to Barakaz's commission if the seller is registered. [VERIFY with accountant]

## 3. shipping_fulfillment — Shipping & Fulfilment Policy

1. Sellers must ship from a Canadian address (street, city, province, postal code and phone are required). At launch, orders only go to Canadian addresses.
2. Every product must have its real weight and package dimensions. Checkout blocks products that are missing them.
3. **Handling time:** the seller's own stated handling time. [VERIFY: maximum allowed, e.g. 3 business days]
4. **Labels:** when a carrier rate is available, Barakaz buys the label only after payment is confirmed. Otherwise the seller books shipping manually and must enter the carrier name and a tracking number or reference.
5. **Shipping rates.** Buyers are shown Standard CA$12.50 and Express CA$19.99 per seller, or live carrier quotes. [FROM EARLIER QA — VERIFY current rates, and who keeps the shipping fee]
6. Late or missing shipments may lead to cancellation, a refund and account action. [VERIFY thresholds]

## 4. returns_refunds — Returns & Refunds Policy

1. **Return window:** 7 days after delivery [OWNER CONFIRMED 2026-09-29; subject to applicable mandatory consumer-protection rights and legal review, including Quebec].
2. **Refund timing:** 5–10 business days after the return is received and inspected, to the original payment method [FROM the Return Policy page].
3. **Who pays return shipping:** [VERIFY — the seller if the item is faulty or not as described; otherwise the buyer?]
4. **Non-returnable items:** [VERIFY list, e.g. hygiene products, perishables]
5. **Commission on refunds:** [VERIFY — refunded or kept]
6. Refunds are issued through Barakaz and taken from the seller's balance. Disputes are decided by Barakaz admins.

## 5. prohibited_products — Prohibited Products Policy

The following are not allowed. [VERIFY with counsel; this list is not complete]
- Anything illegal to sell in Canada or the buyer's province.
- Weapons, firearms and parts, ammunition, explosives.
- Cannabis, tobacco, vaping products, alcohol, prescription drugs, controlled substances.
- Counterfeit or infringing goods.
- Recalled products (Health Canada recalls), unsafe children's products (CCPSA).
- Hazardous materials that carriers won't accept.
- Live animals, human remains or body parts.
- Stolen goods; personal data; adult content.
- Items breaching sanctions or export controls.

Barakaz may remove listings and suspend sellers who break this policy.

## 6. product_authenticity — Product Authenticity & Legal-Sale Confirmation

By accepting, the seller confirms that:
1. Every product they list is genuine and legally obtained, and they have the right to sell it in Canada.
2. The products meet Canadian labelling requirements (bilingual where required), safety rules and product standards. [VERIFY which apply]
3. They will provide proof of authenticity or supply records (for example invoices) within **[VERIFY: e.g. 5 business days]** when Barakaz asks.
4. They accept that listings may be removed, orders refunded, and accounts suspended if authenticity can't be proven.

---

## Before publishing (owner and counsel)
- Replace every [VERIFY] item and get legal approval.
- Host the final documents at stable URLs, for example barakaz.com/seller-policies/<code>.
- Then ask for them to be published as rows in `seller_policy_documents` (policy_code, policy_version = `ca-v1`, title, document_url, published_at).


## Launch finalization decisions — 2026-09-29

Owner confirmed category commissions (8–15%, default 12%) and a seven-day voluntary return window. These decisions are merged into main. **No legal sign-off or publication is recorded.**

### Proposed operational clauses requiring owner approval and legal review
- Commission calculation: item subtotal excluding sales tax and shipping; verify actual code before adoption.
- Return shipping: seller covers verified defective, incorrect or materially misdescribed goods; buyer covers voluntary change-of-mind returns where legally permitted. Mandatory consumer rights override voluntary restrictions.
- Refund processing: communicate the existing stated 5–10 business day processing target, subject to payment-provider timing and any mandatory statutory deadlines.
- Seller verification: require accurate identity and business registration information appropriate to business type; let Stripe collect its own regulated verification details; avoid unnecessary local storage of government ID images.
- Payout timing: disclose the actual Stripe payout schedule and any platform reserve after checking the connected account configuration. Do not promise an unverified schedule.
- Shipping: Canadian domestic origins and destinations only; disclose actual delivery estimates and seller handling times. Fixed customer shipping fees require operational cost validation.

### Outstanding non-delegable facts and approvals
1. Owner confirms legal entity **Barakaz Inc** and incorporation in **Alberta, Canada**. Stripe lists 5308 147 Avenue NW, Unit 204, Edmonton, AB T5A 4J2, Canada as the company address; confirm this is also its legal registered office. Stripe company-name formatting is "Barakaz,Inc." while owner confirms "Barakaz Inc"; verify corporate registry spelling. Confirm governing-law/dispute clauses with counsel.
2. Confirm payment processing fee allocation, chargeback allocation, commission refund treatment and payout holds against actual Stripe integration.
3. Confirm handling-time limits, return exclusions and notice/termination periods; have counsel prepare liability, indemnity, disputes and Quebec language/privacy provisions.
4. Confirm tax registration and marketplace tax responsibility with a Canadian tax professional. Do not assert automatic GST/HST collection/remittance obligations without review.
5. After approved wording is published to stable HTTPS URLs, record exact policy versions and URLs in seller_policy_documents and test acceptance.

Official background: https://ised-isde.canada.ca/site/office-consumer-affairs/en/business-practices-and-consumer-concerns/refund-and-exchange ; https://www.opc.gouv.qc.ca/en/consumer/topic/purchase/online-purchase/advice/ .
