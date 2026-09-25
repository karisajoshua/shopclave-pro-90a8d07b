# Architecture decisions

- Seller-private JSON fields are read through the owner-scoped `get_vendor_private_fields_v2` RPC; its JSONB contract matches storage and avoids exposing private columns through public seller queries.