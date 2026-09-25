# Fix seller shipping settings persistence

## Scope
- Correct the private seller-settings read contract so `warehouse_address` is returned as JSON, matching the database column and checkout validator.
- Make Save Settings update only the signed-in seller’s row and require a returned row, so a blocked/no-op update cannot appear successful.
- Reload the saved private fields after each save, compare them with submitted values, and show durable success or actionable error feedback.
- Keep checkout’s shipping completeness checks unchanged and do not add or invent seller address data.

## Technical details
- Apply an additive corrective database migration replacing `get_vendor_private_fields` with a JSONB return type while preserving owner/admin authorization and execution grants.
- Synchronize the form when the seller query is refreshed and normalize the private JSON response safely.
- Run focused tests and inspect the current build diagnostics after implementation.
