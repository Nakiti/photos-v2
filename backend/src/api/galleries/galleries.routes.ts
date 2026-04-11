import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import {
  createGallery,
  getMyGalleries,
  getGalleriesByCommunity,
  getGalleryDetails,
  updateGallery,
  deleteGallery,
  joinGalleryByLink,
  reconcileGalleryPhotos,
  requestIconUpload,
  searchGalleries,
  getRateLimitState,
  transferOwnership,
  getShareLink,
} from './galleries.controller.js';
import photoRoutes from './photos/photos.routes.js';
import membersRoutes from './members/members.routes.js';
import tagsRoutes from './tags/tags.routes.js';
import {
  joinGallery as joinGalleryAsUser,
  leaveGallery,
} from './members/members.controller.js';

const router = Router();

// --- Protected Routes ---
// All gallery routes require authentication

/**
 * @route POST /api/v1/galleries
 * @summary Create a new gallery with the authenticated user as owner
 * @access Private
 */
router.post('/', isAuthenticated, createGallery);

/**
 * @route GET /api/v1/galleries/search
 * @summary Search through galleries the user has access to with optional filters
 * @query search - General search term (searches name, location)
 * @query name - Filter by gallery name (partial match)
 * @query type - Filter by gallery type (GROUP or EVENT)
 * @query location - Filter by location (partial match)
 * @query limit - Maximum number of results (default: 20, max: 100)
 * @query offset - Pagination offset (default: 0)
 * @access Private
 */
router.get('/search', isAuthenticated, searchGalleries);

/**
 * @route GET /api/v1/galleries
 * @summary List galleries owned by or shared with the user
 * @access Private
 */
router.get('/', isAuthenticated, getMyGalleries);

/**
 * @route GET /api/v1/galleries/community/:communityId
 * @summary List galleries within a community the user has access to
 * @access Private
 */
router.get('/community/:communityId', isAuthenticated, getGalleriesByCommunity);

/**
 * @route GET /api/v1/galleries/:galleryId
 * @summary Get details for a gallery if the user has access
 * @access Private
 */
router.get('/:galleryId', isAuthenticated, getGalleryDetails);

/**
 * @route GET /api/v1/galleries/:galleryId/rate-limit-state
 * @summary Get current rate limit state for the authenticated user in this gallery
 * @access Private
 */
router.get('/:galleryId/rate-limit-state', isAuthenticated, getRateLimitState);

/**
 * @route GET /api/v1/galleries/:galleryId/share-link
 * @summary Generate a Branch.io deep link for sharing a gallery
 * @access Private
 */
router.get('/:galleryId/share-link', isAuthenticated, getShareLink);

/**
 * @route PUT /api/v1/galleries/:galleryId
 * @summary Update gallery fields (owner only)
 * @access Private
 */
router.put('/:galleryId', isAuthenticated, updateGallery);

/**
 * @route PUT /api/v1/galleries/:galleryId/transfer-ownership
 * @summary Transfer gallery ownership to another accepted member (owner only)
 * @access Private
 */
router.put('/:galleryId/transfer-ownership', isAuthenticated, transferOwnership);

/**
 * @route POST /api/v1/galleries/:galleryId/icon/presign
 * @description Get a presigned URL to upload a new gallery icon.
 * @access Private (Admin/Owner)
 */
router.post('/:galleryId/icon/presign', isAuthenticated, requestIconUpload);

/**
 * @route DELETE /api/v1/galleries/:galleryId
 * @summary Delete a gallery (owner only)
 * @access Private
 */
router.delete('/:galleryId', isAuthenticated, deleteGallery);

/**
 * @route GET /api/v1/galleries/:galleryId/photos/sync
 * @summary Return an array of photo ids for reconciliation
 * @access Private
 */
router.get('/:galleryId/photos/sync', isAuthenticated, reconcileGalleryPhotos)


// --- Semi-Public Join Route ---
/**
 * @route POST /api/v1/galleries/join/:shareableLink
 * @summary Join a gallery via shareable link
 * @access Private (must be authenticated)
 */
router.post('/join/:shareableLink', isAuthenticated, joinGalleryByLink);

// --- Membership (per current user) ---
// POST /api/v1/galleries/:galleryId/join
router.post('/:galleryId/join', isAuthenticated, joinGalleryAsUser);

// DELETE /api/v1/galleries/:galleryId/leave
router.delete('/:galleryId/leave', isAuthenticated, leaveGallery);



// --- Nested Photo Routes ---
// Mounts all routes from photos.routes.ts under /:galleryId/photos
// e.g., /api/v1/galleries/123/photos/presign
router.use('/:galleryId/photos', photoRoutes);

// --- Nested Members Routes ---
// Mounts all routes from members.routes.ts under /:galleryId/members
router.use('/:galleryId/members', membersRoutes);

// --- Nested Tags Routes ---
// Mounts all routes from tags.routes.ts under /:galleryId/tags
router.use('/:galleryId/tags', tagsRoutes);


export default router;
