export interface ProductDisplayStats {
  rating: number;
  reviewCount: number;
  soldCount: number;
  seededRating: boolean;
  seededSold: boolean;
}

const hashProductId = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/**
 * Temporary, deterministic display fallbacks for products without activity.
 * Real reviews and paid-order totals always win independently.
 */
export const getProductDisplayStats = (
  productId: string,
  realRating = 0,
  realReviewCount = 0,
  realSoldCount = 0,
): ProductDisplayStats => {
  const hash = hashProductId(productId);
  const hasRealReviews = realReviewCount > 0;
  const hasRealSold = realSoldCount > 0;

  return {
    rating: hasRealReviews ? realRating : Number((4.2 + (hash % 7) / 10).toFixed(1)),
    reviewCount: hasRealReviews ? realReviewCount : 8 + ((hash >>> 4) % 84),
    soldCount: hasRealSold ? realSoldCount : 12 + ((hash >>> 11) % 189),
    seededRating: !hasRealReviews,
    seededSold: !hasRealSold,
  };
};