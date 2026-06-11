/** Shared upload limits for document/file uploads (Storage). */

/** Maximum size, in MB, for any document/file upload. */
export const MAX_UPLOAD_MB = 10;

/** Maximum size, in bytes, for any document/file upload. */
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Maximum size, in MB, for image uploads (avatars, logos, QR). */
export const MAX_IMAGE_UPLOAD_MB = 2;

/** Maximum size, in bytes, for image uploads (avatars, logos, QR). */
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024;
