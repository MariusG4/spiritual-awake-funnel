/**
 * Cloudinary image utility for generating optimized, responsive image URLs.
 *
 * Environment variables (set in Netlify / .env):
 *   PUBLIC_CLOUDINARY_CLOUD_NAME  – your Cloudinary cloud name (required for URL generation)
 *   CLOUDINARY_API_KEY            – API key (needed for server-side uploads, not URL generation)
 *   CLOUDINARY_API_SECRET         – API secret (needed for server-side uploads, not URL generation)
 *
 * Cloudinary URL structure:
 *   https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
 */

const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;
const BASE_URL = 'https://res.cloudinary.com';

export interface CloudinaryOptions {
  /** Resize width in pixels. */
  width?: number;
  /** Resize height in pixels. */
  height?: number;
  /** Cropping mode. Defaults to 'fill'. */
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
  /** Gravity / focal-point selection. Defaults to 'auto'. */
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  /** Image quality. Defaults to 'auto'. */
  quality?: 'auto' | number;
  /** Output format. Defaults to 'auto' (serves WebP/AVIF based on browser support). */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  /** Aspect ratio string, e.g. '16:9'. Applied as an ar_ transformation. */
  aspectRatio?: string;
}

/**
 * Build a Cloudinary transformation URL for the given public ID.
 *
 * @example
 * getCloudinaryUrl('blog/my-hero-image', { width: 1100, quality: 'auto', format: 'auto' })
 * // → https://res.cloudinary.com/my-cloud/image/upload/c_fill,g_auto,w_1100,q_auto,f_auto/blog/my-hero-image
 */
export function getCloudinaryUrl(publicId: string, options: CloudinaryOptions = {}): string {
  if (!CLOUD_NAME) {
    // Return empty string — callers should fall back to the original image URL.
    return '';
  }

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto',
    aspectRatio,
  } = options;

  const transforms: string[] = [];

  // Ordering matters: crop/gravity → dimensions → aspect ratio → quality → format
  transforms.push(`c_${crop}`);
  transforms.push(`g_${gravity}`);
  if (width)        transforms.push(`w_${width}`);
  if (height)       transforms.push(`h_${height}`);
  if (aspectRatio)  transforms.push(`ar_${aspectRatio.replace(':', ':')}`); // keep colon: Cloudinary supports it
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  const transformStr = transforms.join(',');
  return `${BASE_URL}/${CLOUD_NAME}/image/upload/${transformStr}/${publicId}`;
}

/**
 * Generate a `srcset` attribute value for responsive images.
 *
 * @example
 * getCloudinarySrcSet('blog/hero', [400, 800, 1100])
 * // → "https://...w_400.../blog/hero 400w, https://...w_800.../blog/hero 800w, ..."
 */
export function getCloudinarySrcSet(
  publicId: string,
  widths: number[],
  baseOptions: Omit<CloudinaryOptions, 'width'> = {}
): string {
  return widths
    .map((w) => `${getCloudinaryUrl(publicId, { ...baseOptions, width: w })} ${w}w`)
    .join(', ');
}

export interface ResolvedImage {
  /** The primary image `src` (smallest useful size for browsers that ignore srcset). */
  src: string;
  /** A responsive `srcset` string, or undefined when using a plain URL fallback. */
  srcset?: string;
  /** Whether the URL was generated from Cloudinary (vs. a plain fallback URL). */
  isCloudinary: boolean;
}

/**
 * Resolve the best image source for a blog post.
 * Prefers `cloudinaryId` (generates optimised URLs) and falls back to `fallbackUrl`.
 *
 * @param cloudinaryId  Cloudinary public ID, e.g. "blog/hero-spiritual-guide"
 * @param fallbackUrl   Plain image URL to use when Cloudinary is not available
 * @param widths        Widths to include in the srcset (default: [400, 800, 1200])
 * @param options       Additional Cloudinary transformation options
 */
export function resolveImage(
  cloudinaryId: string | undefined,
  fallbackUrl: string | undefined,
  widths: number[] = [400, 800, 1200],
  options: Omit<CloudinaryOptions, 'width'> = {}
): ResolvedImage {
  if (cloudinaryId && CLOUD_NAME) {
    const smallestWidth = widths[0] ?? 800;
    return {
      src: getCloudinaryUrl(cloudinaryId, { ...options, width: smallestWidth }),
      srcset: getCloudinarySrcSet(cloudinaryId, widths, options),
      isCloudinary: true,
    };
  }

  return {
    src: fallbackUrl ?? '',
    srcset: undefined,
    isCloudinary: false,
  };
}

