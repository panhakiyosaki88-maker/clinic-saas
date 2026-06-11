/** Helpers for turning a react-easy-crop selection into an uploadable blob. */

export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

/**
 * Crops `src` to `area` (in natural-image pixels, as reported by react-easy-crop's
 * `onCropComplete`) and returns a PNG blob. The output is capped to `maxSize` on
 * its longest edge so avatars/logos stay small.
 */
export async function croppedImageBlob(
  src: string,
  area: PixelArea,
  maxSize = 512
): Promise<Blob> {
  const image = await loadImage(src);

  const cropW = Math.max(1, Math.round(area.width));
  const cropH = Math.max(1, Math.round(area.height));

  // Scale down if the crop is larger than the allowed output edge.
  const scale = Math.min(1, maxSize / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, area.x, area.y, cropW, cropH, 0, 0, outW, outH);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not crop image."))),
      "image/png"
    )
  );
}
