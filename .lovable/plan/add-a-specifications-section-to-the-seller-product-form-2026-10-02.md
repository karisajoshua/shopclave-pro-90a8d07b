# Add a Specifications section to the seller product form

Right now sellers can't type their own specifications (for example Material: Cotton or Battery: 5000 mAh). The product page table only shows fixed fields such as brand, model, condition, weight and size.

## What changes
- **Details step (Add and Edit product):** a new "Specifications" area with rows. Each row has a Name and a Value, an "Add specification" button and a remove button. Up to 30 rows. A few common names are suggested (Material, Colour, Size, Model, Warranty, Country of origin), and sellers can also type their own.
- **Review step:** a Specifications card listing every row, with an Edit button that goes back to the Details step.
- **Product page:** the seller's rows appear in the Specifications table, after the standard rows. Long tables use the same "Show more" link as before.
- Empty rows are ignored when saving. Names and values have length limits. Existing products are not changed and still show their standard rows.

## Technical details
- Additive migration: `products.specifications jsonb not null default '[]'`, stored as an array of `{name, value}`. Existing grants and RLS policies stay the same.
- New `SpecificationsFields` component in ProductListingExtras with `normalizeSpecifications` and `validateSpecifications` (trim, dedupe names, name ≤ 60 chars, value ≤ 200 chars, max 30), plus tests.
- Wire it into AddProductPage and EditProductPage: state, load, save payload and review card.
- ProductDetailPage passes `specifications` in the meta prop. ProductDescriptionTabs appends those rows to `specificationRows`.
- Nothing gets published.
