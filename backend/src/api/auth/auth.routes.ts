import { Router } from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from './auth.controller.js';
import { authRateLimit } from '../../middleware/authRateLimit.middleware.js';

const router = Router();

router.post('/register', authRateLimit, registerUser);
router.post('/login', authRateLimit, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

export default router;
