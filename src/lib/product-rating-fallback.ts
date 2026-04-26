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