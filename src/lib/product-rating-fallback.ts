export const seededRandom = (seed: string, min: number, max: number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return min + (Math.abs(hash) % (max - min + 1));
};

export const seededFloat = (seed: string, min: number, max: number, decimals = 1) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const range = (max - min) * Math.pow(10, decimals);
  const val = min + (Math.abs(hash) % (range + 1)) / Math.pow(10, decimals);
  return parseFloat(val.toFixed(decimals));
};

export const getDisplayProductRating = (
  productId: string,
  rating = 0,
  reviewCount = 0,
) => {
  const hasRealReviews = reviewCount > 0;

  return {
    rating: hasRealReviews ? rating : seededFloat(productId, 4.2, 4.7),
    reviewCount: hasRealReviews ? reviewCount : seededRandom(`${productId}rc`, 24, 156),
  };
};

export const getDisplayVendorPerformance = (vendorId: string) => {
  const customerRating = seededFloat(`${vendorId}cr`, 4.3, 4.9);
  return {
    responseRate: seededRandom(`${vendorId}rr`, 92, 99),
    responseTime: seededRandom(`${vendorId}rt`, 5, 30),
    onTimeDelivery: seededRandom(`${vendorId}otd`, 90, 99),
    orderCompletion: seededRandom(`${vendorId}oc`, 95, 99),
    qualityScore: seededFloat(`${vendorId}qs`, 4.3, 4.9),
    customerRating,
    ratingsCount: seededRandom(`${vendorId}rcnt`, 200, 2000),
    isTopRated: customerRating >= 4.5,
  };
};