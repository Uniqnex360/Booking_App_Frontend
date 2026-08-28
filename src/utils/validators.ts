import { z } from 'zod';

export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .min(10, 'Please enter a valid phone number')
  .regex(/^\+?[\d\s()-]+$/, 'Please enter a valid phone number');

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export const validatePassword = (password: string) => {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'One letter', met: /[a-zA-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'No triple repeats', met: !/(.)\1{2,}/.test(password) },
  ];

  return {
    isValid: checks.every((c) => c.met),
    checks,
  };
};