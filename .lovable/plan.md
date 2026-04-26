# Comprehensive Admin Documentation — Plan

Deliver a single canonical "Barakaz Admin Manual" in **three synchronized formats** (Markdown master → PDF + DOCX), covering every feature visible to admin users, with a workflows-first section followed by a technical appendix.

## Deliverables (in `/mnt/documents/`)

- `Barakaz-Admin-Manual.md` — master source
- `Barakaz-Admin-Manual.pdf` — branded printable manual (cover, TOC, page numbers)
- `Barakaz-Admin-Manual.docx` — editable Word doc with same structure

## Document Structure

### Front matter
- Cover page (Barakaz brand, doc title, version, generated date)
- Table of contents (auto-generated, hyperlinked)
- "How to read this manual" (audience: admin staff first, technical appendix second)
- Glossary of key terms (vendor, order item, dispute, evidence vault, team role, permission key, RLS, edge function)

### Part 1 — Getting Around the Admin Panel
- Signing in & role check (admin role required, redirect logic)
- Admin layout: sidebar groups, collapsible icon mode, header (notifications bell, search, profile menu)
- Permission gating model (Super Admin vs scoped Team Roles)
- Mobile vs desktop behavior

### Part 2 — Feature Reference (one chapter per sidebar item)

Each chapter follows the same template:
**Purpose → How to access → Page anatomy → Step-by-step workflows → Filters & search → Bulk actions → Edge cases & validation → Required permission → Underlying tables/RLS**

Chapters:
1. **Dashboard** (`/admin`) — KPI cards, performance graphs, Action Required panel, Quick Nav grid, Recent Activity feed, Site Analytics widget
2. **Orders** (`/admin/orders`) — order list, status filter, order details, status transitions, payment status, shipping address view
3. **Evidence Vault** (`/admin/evidence`) — disputes list, opening/closing disputes, admin notes, chat snapshot, attachments, audit log, risk flags
4. **Messages** (`/admin/messages`) — buyer↔vendor conversations, message edit history, soft-deleted messages, system messages
5. **Notifications** (`/admin/notifications`) — broadcast to all users / specific vendor / specific user, title + message composer
6. **Products** (`/admin/products`) — full catalog view, search, edit images & video, set deal timer (compare_at_price + deal_ends_at), feature toggle, activate/deactivate, status pills
7. **Categories** (`/admin/categories`) — tree view, create/edit/delete, parent-child, slug auto-gen, image upload
8. **Bulk Import** (`/admin/bulk-import`) — CSV/Excel template, vendor selector, validation, dry-run, error report
9. **Media Library** (`/admin/media`) — cross-vendor image management, upload, delete, copy short link
10. **Withdrawals** (`/admin/withdrawals`) — pending payouts queue, approve/reject with notes, payout history
11. **Subscriptions** (`/admin/subscriptions`) — pending payment verifications, all vendor subscriptions, plan tiers, manual confirm/reject
12. **Analytics** (`/admin/analytics`) — site analytics cache, vendor analytics events, traffic, top products, refresh schedule
13. **Marketing** (`/admin/marketing`) — hero banners (carousel), promo strip (brand & product), schedule windows, display order, image upload, link picker (category/product/vendor/URL)
14. **Barakaz Academy** (`/admin/resources`) — categories, lessons (article/video), publish/feature, gallery, attachments, tags, difficulty, duration, view counts, feedback
15. **Vendors** (`/admin/vendors`) — vendor list, approve/suspend, store profile review
16. **Users** (`/admin/users`) — profile list, search, assign/remove roles (vendor, admin)
17. **Team & Roles** (`/admin/team`) — create custom roles, permission matrix, assign admins to roles, Super Admin behavior
18. **Settings** (`/admin/settings`) — M-Pesa configuration (till, paybill, account name, phone, instructions), platform-wide toggles

### Part 3 — Cross-Cutting Workflows
- Approving a new vendor end-to-end
- Handling a buyer dispute (open → evidence → resolve → audit log)
- Running a flash sale (deal timer + hero banner + featured products)
- Onboarding a staff member (create user → assign admin role → assign team role)
- Processing a withdrawal request

### Part 4 — Technical Appendix
- **Architecture overview** (React + Vite + Tailwind + shadcn, Supabase backend, edge functions)
- **Permissions reference table** — every key in `PERMISSIONS` with which sidebar item gates it and which RLS policies use it (`has_permission`, `can_manage_resources`, `has_role`)
- **Data model** — full table inventory (categories, products, product_variants, product_images, orders, order_items, reviews, vendors, profiles, user_roles, team_roles, team_members, hero_banners, promotions, resources + related, disputes, audit_logs, notifications, chat_messages + attachments + edit_history, withdrawals, subscriptions, platform_settings, site_analytics_cache, vendor_analytics, user_risk_flags, addresses, short_links, cookie_consents, email_send_log/state, email_unsubscribe_tokens, suppressed_emails) — purpose + key columns + RLS summary
- **Edge functions** — `create-order`, `auth-email-hook`, `process-email-queue`, `send-transactional-email`, `preview-transactional-email`, `handle-email-suppression`, `handle-email-unsubscribe`, `refresh-site-analytics` — what each does, who triggers it
- **Realtime subscriptions** — which tables admins observe live (orders, messages, notifications)
- **Security model** — RLS-first, `has_role` SECURITY DEFINER, separate `user_roles` table, audit logging
- **Storage buckets** — product images, resource media, chat attachments

## Generation Approach

1. Author the master document as Markdown (`Barakaz-Admin-Manual.md`) — single source of truth.
2. Render PDF via Python + ReportLab (Platypus) with: cover page, branded header/footer, TOC with page numbers, syntax-styled code blocks for SQL/permission keys, tables for the permissions matrix and data model.
3. Generate DOCX via `docx-js` script with: heading styles (overrides for Heading1-3), TOC field, tables for permissions/data model, page numbering, US Letter page size.
4. Visual QA: convert PDF and DOCX→PDF to images, inspect every page for clipping/overflow/blank pages, fix and re-render until clean.
5. Emit `<lov-artifact>` tags for all three files so the user can open/download them inline.

## Style & Branding

- Use Barakaz orange (deep orange accent) for headings & dividers, charcoal body text, white background
- Inter / Helvetica family for body, bold sans for headings
- Keep tables narrow enough for portrait US Letter
- Number every section (1, 1.1, 1.1.1) for cross-referencing
- Include a "Quick Reference" foldout: sidebar map + permission key cheatsheet on a single page

## Out of Scope

- No code changes to the running app
- No new screenshots captured from the live preview (would require browser tooling and be brittle); the manual describes UI structure in words and ASCII layout sketches instead. If you want real screenshots embedded, say so and I'll add a screenshot-capture pass to the plan.
