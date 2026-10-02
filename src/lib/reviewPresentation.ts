export interface RatingDistributionItem {
  star: number;
  count: number;
  pct: number;
}

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
    let source = -1;
    for (let index = counts.length - 1; index >= 0; index -= 1) {
      if (counts[index] > 0 && stars[index] < 5) {
        source = index;
        break;
      }
    }
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
