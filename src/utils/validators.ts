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

/**
 * Strict Indian mobile number validation:
 * Must be exactly 10 digits starting with 6, 7, 8, or 9.
 */
export function isValidIndianMobile(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Strips non-digits, country code +91 prefix, and limits to 10 digits.
 */
export function sanitizeMobileNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits.slice(-10);
}

/**
 * Checks whether an email is an internal/techteam testing email
 * that should NEVER be prefilled as default in the customer booking flow.
 */
export function isInternalOrTechEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower.includes('techteam') ||
    lower.includes('uniqnex360') ||
    lower.includes('example.com') ||
    lower.endsWith('@admin.com') ||
    lower.startsWith('test@') ||
    lower.startsWith('tester@')
  );
}

/**
 * Filters out internal/techteam emails, returning an empty string if matched.
 */
export function filterCustomerEmail(email?: string | null): string {
  if (!email || isInternalOrTechEmail(email)) return '';
  return email.trim();
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