import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import userRoutes from './users/user.routes.js';
import galleriesRoutes from './galleries/galleries.routes.js';
import friendshipsRoutes from './friendships/friendship.routes.js';
import communitiesRoutes from './communities/communities.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/galleries', galleriesRoutes);
router.use('/friendships', friendshipsRoutes);
router.use('/communities', communitiesRoutes);

export default router;