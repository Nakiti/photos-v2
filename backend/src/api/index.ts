import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import userRoutes from './users/user.routes.js';
import galleriesRoutes from './galleries/galleries.routes.js';
import groupsRoutes from './groups/groups.routes.js';
import notificationsRoutes from './notifications/notifications.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/galleries', galleriesRoutes);
router.use('/communities', groupsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
