// src/api/v1/auth/auth.validation.ts
import { z } from 'zod';

export const registerUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().optional(), // Make name optional
    handle: z.string()
  }),
});

// Define a type based on the schema for better type safety
export type RegisterUserDto = z.infer<typeof registerUserSchema>['body'];

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type LoginDto = z.infer<typeof loginSchema>['body'];