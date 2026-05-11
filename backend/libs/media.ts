import config from '../config/config.js';

/**
 * Builds a media URL for a given S3 key.
 * Uses CloudFront if configured, otherwise falls back to the direct S3 URL.
 */
export function buildMediaUrl(key: string): string {
  if (config.cloudfront?.baseUrl) {
    return `${config.cloudfront.baseUrl}/${key}`;
  }
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}

/**
 * Converts a stored S3 URL to a CloudFront URL by extracting the key.
 * Idempotent — safe to call on URLs that are already CloudFront URLs.
 */
export function toMediaUrl(storedUrl: string | null | undefined): string | null | undefined {
  if (!storedUrl) return storedUrl;
  try {
    const key = new URL(storedUrl).pathname.slice(1);
    return buildMediaUrl(key);
  } catch {
    return storedUrl;
  }
}
