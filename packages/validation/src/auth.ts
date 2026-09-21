import { z } from 'zod';

import { email, nonEmpty, password, phone } from './primitives';

export const registerSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
    fullName: nonEmpty('Full name', 120),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const updateProfileSchema = z.object({
  fullName: nonEmpty('Full name', 120).optional(),
  phone: phone.optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  dataSaver: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
