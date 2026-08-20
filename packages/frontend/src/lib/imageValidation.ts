const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB, matches shared MAX_UPLOAD_BYTES
const MAX_DIMENSION_PX = 2000; // keeps upload fast on mobile data and bounds vision-model input size
const JPEG_QUALITY = 0.85;

export class ImageValidationError extends Error {}

/**
 * Normalizes a phone photo into a size-capped JPEG before upload. Also the practical fix for
 * HEIC photos (iPhone default format) that OpenAI's vision API doesn't accept directly — if the
 * browser can decode the source image (Safari can decode HEIC; Chrome/Firefox generally cannot),
 * re-encoding through <canvas> always yields a JPEG regardless of the input format.
 */
export async function normalizeImageForUpload(file: File): Promise<File> {
  if (file.size > MAX_UPLOAD_BYTES * 4) {
    // fail fast on absurdly large files before even attempting to decode them
    throw new ImageValidationError('That photo is too large. Please choose a smaller one.');
  }

  const bitmap = await loadImageBitmap(file);
  const { width, height } = scaledDimensions(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageValidationError('Your browser cannot process images.');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new ImageValidationError('Could not process that photo. Please try another.');
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError('That photo is too large even after compressing it.');
  }

  return new File([blob], renameToJpeg(file.name), { type: 'image/jpeg' });
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ImageValidationError(
      "Your browser couldn't open this photo. If it's a HEIC photo, try converting it to JPEG first.",
    );
  }
}

function scaledDimensions(width: number, height: number): { width: number; height: number } {
  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_DIMENSION_PX) return { width, height };
  const scale = MAX_DIMENSION_PX / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function renameToJpeg(originalName: string): string {
  return originalName.replace(/\.[^.]+$/, '') + '.jpg';
}
