import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import {
  registerUserSchema, type RegisterUserDto,
  loginSchema, type LoginDto,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';
import { z } from 'zod';

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerUserSchema.parse({ body: req.body });
    const { email, password, name, handle } = validatedData.body as RegisterUserDto;

    const { user, accessToken, refreshToken } = await authService.createUser(email, password, name, handle);
    return res.status(201).json({ user, token: accessToken, refreshToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.parse({ body: req.body });
    const { email, password } = parsed.body as LoginDto;
    const result = await authService.loginUser(email, password);
    if (!result) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body?.refreshToken;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ message: 'refreshToken is required' });
    }
    const result = await authService.refreshAccessToken(raw);
    if (!result) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body?.refreshToken;
    if (raw && typeof raw === 'string') {
      await authService.revokeRefreshToken(raw);
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = forgotPasswordSchema.parse({ body: req.body });
    await authService.requestPasswordReset(parsed.body.email);
    // Always 200 — never reveal whether the email is registered
    return res.status(200).json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resetPasswordSchema.parse({ body: req.body });
    const { code, newPassword } = parsed.body;
    const ok = await authService.resetPassword(code, newPassword);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.flatten().fieldErrors });
    }
    next(error);
  }
};
