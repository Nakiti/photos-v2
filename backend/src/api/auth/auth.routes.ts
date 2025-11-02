import { Router } from 'express';
import { registerUser, loginUser } from './auth.controller.js'; // Import controller functions

const router = Router();

/**
 * @route POST /api/v1/auth/register
 * @summary Register a new user account
 * @access Public
 */
router.post('/register', registerUser); 

/**
 * @route POST /api/v1/auth/login
 * @summary Authenticate user and return an access token
 * @access Public
 */
router.post('/login', loginUser);


export default router;