/**
 * Convert an image File/Blob to WebP using a canvas. Non-images, SVGs, GIFs and
 * existing WebPs pass through unchanged. Optionally downscales to maxDim on the
 * longest side to keep huge phone photos manageable.
 */
export interface ToWebpOptions {
  quality?: number; // 0..1
  maxDim?: number; // px on longest side
}

const PASSTHROUGH = /^image\/(svg\+xml|gif|webp)$/i;

const loadImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

export async function convertImageToWebp(
  file: File,
  opts: ToWebpOptions = {},
): Promise<File> {
  const { quality = 0.85, maxDim = 2000 } = opts;

  // Skip non-images and formats we don't want to re-encode
  if (!file.type.startsWith("image/")) return file;
  if (PASSTHROUGH.test(file.type)) return file;

  try {
    const img = await loadImage(file);
    let { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    const longest = Math.max(w, h);
    if (longest > maxDim) {
      const scale = maxDim / longest;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality),
    );
    if (!blob) return file;

    // Only swap if the webp is actually smaller (rare corner cases)
    if (blob.size >= file.size && file.type === "image/webp") return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, "") || "image";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/** Convenience: convert if image, otherwise return original. */
export const maybeToWebp = convertImageToWebp;
