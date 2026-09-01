export type TargetQuality = '360p' | '480p' | '720p' | '1080p';

/**
 * Derives quality string (e.g., '720p') from media dimensions.
 * For vertical video (e.g. 720x1280) or landscape (1280x720), uses the smaller dimension.
 */
export function getVideoQuality(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) {
    return 'Unknown';
  }
  const minDim = Math.min(width, height);
  return `${minDim}p`;
}

/**
 * Ensures a number is rounded to the nearest even integer (required for H.264 video scaling).
 */
function makeEven(val: number): number {
  const rounded = Math.round(val);
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

/**
 * Calculates output dimensions (width & height) for a target quality variant
 * while strictly preserving the source aspect ratio.
 */
export function calculateVariantDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetQuality: TargetQuality
): { width: number; height: number } {
  const targetMinDim = parseInt(targetQuality.replace('p', ''), 10);
  if (isNaN(targetMinDim) || targetMinDim <= 0) {
    return { width: sourceWidth, height: sourceHeight };
  }

  const isVertical = sourceHeight > sourceWidth;

  if (isVertical) {
    // For vertical videos (e.g. 720x1280), targetMinDim corresponds to width
    const targetWidth = makeEven(targetMinDim);
    const scaleFactor = targetWidth / sourceWidth;
    const targetHeight = makeEven(sourceHeight * scaleFactor);
    return { width: targetWidth, height: targetHeight };
  } else {
    // For landscape videos (e.g. 1280x720), targetMinDim corresponds to height
    const targetHeight = makeEven(targetMinDim);
    const scaleFactor = targetHeight / sourceHeight;
    const targetWidth = makeEven(sourceWidth * scaleFactor);
    return { width: targetWidth, height: targetHeight };
  }
}
