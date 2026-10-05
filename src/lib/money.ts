/** Catalogue, checkout, refunds and settlements use CAD. Location never changes prices. */
export const formatCAD = (value: number) => `CA$${Number(value).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const validComparePrice = (price: number, compare?: number | null) =>
  Number.isFinite(compare) && Number(compare) > price ? Number(compare) : null;
