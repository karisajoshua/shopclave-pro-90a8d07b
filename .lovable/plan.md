# Fix product edits not saving correctly

## What is going wrong
I checked your most recent edit to the "Hard Hat Chin Strap" listing (saved at 00:15 UTC).
- The main details did save: brand "Gabre", the barcode and the shipping options are all in the database.
- The variants (sizes) did not update. When you save, the edit form tries to delete every old variant and then create new ones. The old "Medium" variant is linked to 24 past orders, so the database won't let it be deleted. The form ignores that refusal and adds new copies anyway.
- Result: the product now has 4 variants instead of 2 (two Medium, two Large). The old pair, which the shop still uses, lost its photos. The new pair holds your changes. So your changes look like they didn't go through.

The same thing will happen to any product whose variants have been ordered before.

## Fix
1. **Update variants in place:** edit existing variants by their ID instead of deleting and recreating them. A new variant is only added when you add a new size or colour. Variants you remove are deleted only if they have never been ordered. If they have been ordered, they get 0 stock so customers can't buy them, and the order history is kept.
2. **Save photos safely:** update photos per variant, and remove only the photos you actually removed.
3. **Stop on errors:** check every save step. If any step fails, you get a clear message instead of "Product updated!".
4. **Refresh after saving:** the seller list, the product page and the admin list reload, so changes show up straight away.
5. **Clean up the Chin Strap:** move your new Medium/Large prices, stock and photos onto the original two variants, then remove the two duplicate copies. Neither duplicate has ever been ordered. No past order is changed.

## Technical details
- `EditProductPage.tsx`: track `id` on each variant row loaded from `product_variants`. Update rows with an id, insert rows without one, and for missing ids delete only rows with no `order_items` reference (otherwise set `stock=0`). Check `error` on every `delete`/`insert`/`update` and throw on failure. Invalidate the `vendor-products`, `product` and admin product queries on success.
- Rebuild `product_images` per variant (by variant_id) instead of deleting every image for the product.
- One data fix through the database query tool: copy the stock, price and images of de7150f3 and 6f88cffe onto 6e0ba66d and 64912792, then delete de7150f3 and 6f88cffe.
- Test: edit a product whose variants have been ordered, save it twice, and check that there are still exactly 2 variants, each with its photos.
