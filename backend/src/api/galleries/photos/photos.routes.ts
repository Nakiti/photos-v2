import { Router } from 'express';
import { isAuthenticated } from '../../../middleware/auth.middleware.js';
import { checkUploadRateLimit } from '../../../middleware/rateLimiter.middleware.js';
import { getPhotosForGallery, getPhotoIdsForSync, requestPresignedUrl, confirmPhotoUpload, deletePhoto, getPhotoLikeStatus, likePhoto, unlikePhoto, getDeletedPhotoIds } from './photos.controller.js';
import photoTagsRoutes from './photoTags/photoTags.routes.js';

// This router is merged into the galleries router, so the path is relative.
// The full path will be /api/v1/galleries/:galleryId/photos
const router = Router({ mergeParams: true }); // mergeParams is crucial for nested routes

// --- GET Routes ---

/**
 * @route GET /api/v1/galleries/:galleryId/photos
 * @description Get a paginated list of photos for a specific gallery.
 * @access Private (must be a member of the gallery)
 */
router.get('/', isAuthenticated, getPhotosForGallery);

/**
 * @route GET /api/v1/galleries/:galleryId/photos/sync
 * @description Get a list of all photo IDs for a gallery to reconcile deletions.
 * @access Private (must be a member of the gallery)
 */
router.get('/sync', isAuthenticated, getPhotoIdsForSync);
router.get('/deleted-since', isAuthenticated, getDeletedPhotoIds);


// --- POST Routes ---

/**
 * @route POST /api/v1/galleries/:galleryId/photos/presign
 * @description Request a secure, presigned URL to upload a photo directly to S3.
 * @access Private (must be a member of the gallery)
 * @rateLimit Checked - verifies user hasn't exceeded limit before allowing presigned URL request
 */
router.post('/presign', isAuthenticated, checkUploadRateLimit, requestPresignedUrl);

/**
 * @route POST /api/v1/galleries/:galleryId/photos/confirm
 * @description Confirm a photo has been successfully uploaded to S3 and save its metadata.
 * @access Private (must be a member of the gallery)
 * @rateLimit Enforced - checks limit before allowing upload, records after successful upload
 */
router.post('/confirm', isAuthenticated, checkUploadRateLimit, confirmPhotoUpload);


// --- Like Routes ---

router.get('/:photoId/like', isAuthenticated, getPhotoLikeStatus);
router.post('/:photoId/like', isAuthenticated, likePhoto);
router.delete('/:photoId/like', isAuthenticated, unlikePhoto);

// --- DELETE Routes ---

/**
 * @route DELETE /api/v1/galleries/:galleryId/photos/:photoId
 * @description Delete a specific photo from a gallery.
 * @access Private (must be the photo uploader or gallery owner)
 */
router.delete('/:photoId', isAuthenticated, deletePhoto);

// --- Nested Photo Tags Routes ---
// Mounts all routes from photoTags.routes.ts under /:galleryId/photos/:photoId/tags
router.use('/:photoId/tags', photoTagsRoutes);

export default router;
