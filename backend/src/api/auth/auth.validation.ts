// src/api/v1/auth/auth.validation.ts
import { z } from 'zod';

export const registerUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
    name: z.string().max(100).optional(),
    handle: z
      .string()
      .min(2, 'Handle must be at least 2 characters')
      .max(30, 'Handle must be at most 30 characters')
      .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  }),
});

// Define a type based on the schema for better type safety
export type RegisterUserDto = z.infer<typeof registerUserSchema>['body'];

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(1, 'Password is required').max(128),
  }),
});

export type LoginDto = z.infer<typeof loginSchema>['body'];