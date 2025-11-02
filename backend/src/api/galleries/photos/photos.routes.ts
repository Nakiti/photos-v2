import { Router } from 'express';
import { isAuthenticated } from '../../../middleware/auth.middleware.js';
import { getPhotosForGallery, getPhotoIdsForSync, requestPresignedUrl, confirmPhotoUpload, deletePhoto } from './photos.controller.js';

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


// --- POST Routes ---

/**
 * @route POST /api/v1/galleries/:galleryId/photos/presign
 * @description Request a secure, presigned URL to upload a photo directly to S3.
 * @access Private (must be a member of the gallery)
 */
router.post('/presign', isAuthenticated, requestPresignedUrl);

/**
 * @route POST /api/v1/galleries/:galleryId/photos/confirm
 * @description Confirm a photo has been successfully uploaded to S3 and save its metadata.
 * @access Private (must be a member of the gallery)
 */
router.post('/confirm', isAuthenticated, confirmPhotoUpload);


// --- DELETE Routes ---

/**
 * @route DELETE /api/v1/galleries/:galleryId/photos/:photoId
 * @description Delete a specific photo from a gallery.
 * @access Private (must be the photo uploader or gallery owner)
 */
router.delete('/:photoId', isAuthenticated, deletePhoto);

export default router;
