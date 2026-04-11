// src/api/v1/auth/auth.controller.ts
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { registerUserSchema, type RegisterUserDto, loginSchema, type LoginDto } from './auth.validation.js'; // Import the schema and type
import { z } from 'zod';

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate the request body using Zod
    const validatedData = registerUserSchema.parse({ body: req.body });
    const { email, password, name, handle } = validatedData.body as RegisterUserDto; // Type assertion
    console.log("register data", validatedData)

    // Call the service layer with validated data
    const newUser = await authService.createUser(email, password, name, handle);

    // Send successful response
    res.status(201).json(newUser);

  } catch (error) {
    // 2. Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
      // Send back a 400 Bad Request with validation issues
      console.log(error)
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors, // Nicely formatted errors
      });
    }

    // Handle other errors (like Prisma unique constraint)
    console.error("Registration error:", error);
    if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Fallback for unexpected errors
    res.status(500).json({ message: 'Failed to register user' });
    // Or pass to a global error handler: next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Validate credentials and issue a JWT on success.
 */
export const loginUser = async (req: Request, res: Response) => {
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
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      });
    }
    return res.status(500).json({ message: 'Failed to login' });
  }
};