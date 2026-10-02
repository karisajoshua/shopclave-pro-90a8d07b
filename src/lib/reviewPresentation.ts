export interface RatingDistributionItem {
  star: number;
  count: number;
  pct: number;
}

export interface SampleReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
}

const sampleComments = [
  "The item matched the description and the ordering experience was straightforward.",
  "Good presentation, clear product details, and an easy purchase process.",
  "The product information was helpful and everything was simple to understand.",
  "A smooth shopping experience with useful details throughout the page.",
  "The listing was clear, well organized, and easy to review before ordering.",
];

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const buildRatingDistribution = (rating: number, total: number): RatingDistributionItem[] => {
  const safeTotal = Math.max(0, Math.floor(total));
  if (!safeTotal) return [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, pct: 0 }));

  const safeRating = Math.min(5, Math.max(1, rating));
  const stars = [5, 4, 3, 2, 1];
  const weights = stars.map((star) => Math.exp(-Math.pow(star - safeRating, 2) / 0.72));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const rawCounts = weights.map((weight) => (weight / weightTotal) * safeTotal);
  const counts = rawCounts.map(Math.floor);

  let remaining = safeTotal - counts.reduce((sum, count) => sum + count, 0);
  rawCounts
    .map((value, index) => ({ index, remainder: value - counts[index] }))
    .sort((a, b) => b.remainder - a.remainder)
    .forEach(({ index }) => {
      if (remaining > 0) {
        counts[index] += 1;
        remaining -= 1;
      }
    });

  const targetScore = Math.round(safeRating * safeTotal);
  let score = counts.reduce((sum, count, index) => sum + count * stars[index], 0);
  while (score < targetScore) {
    const source = counts.findLastIndex((count, index) => count > 0 && stars[index] < 5);
    if (source < 0) break;
    counts[source] -= 1;
    counts[source - 1] += 1;
    score += 1;
  }
  while (score > targetScore) {
    const source = counts.findIndex((count, index) => count > 0 && stars[index] > 1);
    if (source < 0) break;
    counts[source] -= 1;
    counts[source + 1] += 1;
    score -= 1;
  }

  return stars.map((star, index) => ({
    star,
    count: counts[index],
    pct: (counts[index] / safeTotal) * 100,
  }));
};

export const buildSampleReviews = (productId: string, count: number): SampleReview[] => {
  const offset = hashText(productId) % sampleComments.length;
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id: `sample-${index}`,
    name: `Sample customer ${index + 1}`,
    rating: index === 4 ? 4 : 5,
    comment: sampleComments[(offset + index) % sampleComments.length],
  }));
};