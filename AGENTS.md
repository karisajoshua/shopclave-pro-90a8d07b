# Architecture decisions

- Seller-private JSON fields are read through the owner-scoped `get_vendor_private_fields_v2` RPC; its JSONB contract matches storage and avoids exposing private columns through public seller queries.
- Hosted payments opened from framed previews use a window created synchronously by the customer's click; delayed parent-frame navigation is blocked by browser sandboxing.
- Product purchase controls share one guarded cart/Buy Now handler across desktop and mobile; this keeps variant and stock enforcement identical at every viewport.
- Product-page delivery choices are stored only as per-seller checkout preferences; server-issued shipping quotes remain authoritative for price and availability.