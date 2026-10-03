export type ProductImageLike = {
  url?: string | null;
  position?: number | null;
  variant_id?: string | null;
};

export type ProductVariantImageLike = {
  id: string;
  image_url?: string | null;
  variant_options?: unknown;
};

const variantOptionValue = (variant: ProductVariantImageLike, optionName: string) => {
  const options = variant.variant_options;
  if (!options || typeof options !== "object" || Array.isArray(options)) return undefined;
  const value = (options as Record<string, unknown>)[optionName];
  return typeof value === "string" ? value : undefined;
};

const uniqueUrls = (urls: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return urls.filter((url): url is string => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

const sortedRows = (images: ProductImageLike[]) => images
  .slice()
  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

export const sharedProductImageUrls = (images: ProductImageLike[]) => uniqueUrls(
  sortedRows(images).filter((image) => !image.variant_id).map((image) => image.url),
);

export const variantImageUrls = (
  variants: ProductVariantImageLike[],
  images: ProductImageLike[],
  matches: (variant: ProductVariantImageLike) => boolean,
) => {
  const matchingVariants = variants.filter(matches);
  const matchingIds = new Set(matchingVariants.map((variant) => variant.id));
  const imageRows = sortedRows(images)
    .filter((image) => image.variant_id && matchingIds.has(image.variant_id))
    .map((image) => image.url);
  const legacyImages = matchingVariants.map((variant) => variant.image_url);
  return uniqueUrls([...imageRows, ...legacyImages]);
};

export const allUploadedImageUrls = (
  variants: ProductVariantImageLike[],
  images: ProductImageLike[],
) => uniqueUrls([
  ...sortedRows(images).map((image) => image.url),
  ...variants.map((variant) => variant.image_url),
]);

export const colorChoiceImageUrl = (
  optionName: string,
  value: string,
  variants: ProductVariantImageLike[],
  images: ProductImageLike[],
) => {
  const specific = variantImageUrls(
    variants,
    images,
    (variant) => variantOptionValue(variant, optionName) === value,
  );
  return specific[0]
    ?? sharedProductImageUrls(images)[0]
    ?? allUploadedImageUrls(variants, images)[0]
    ?? null;
};

export const galleryImageUrls = ({
  images,
  variants,
  colorName,
  colorValue,
  selectedVariantId,
}: {
  images: ProductImageLike[];
  variants: ProductVariantImageLike[];
  colorName?: string;
  colorValue?: string;
  selectedVariantId?: string;
}) => {
  const shared = sharedProductImageUrls(images);
  const specific = colorName && colorValue
    ? variantImageUrls(variants, images, (variant) => variantOptionValue(variant, colorName) === colorValue)
    : selectedVariantId
      ? variantImageUrls(variants, images, (variant) => variant.id === selectedVariantId)
      : [];

  const selected = uniqueUrls([...specific, ...shared]);
  if (selected.length) return selected;
  return allUploadedImageUrls(variants, images);
};