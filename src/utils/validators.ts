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
 * Retrieves saved contact details from localStorage.
 * If techteam email was previously stored on the device during testing, purges it from localStorage.
 */
export function getSavedContactDetails(): { email: string; phone: string } {
  try {
    const raw = localStorage.getItem('vyhbz_contact_details');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.email && parsed.email.toLowerCase().includes('techteam')) {
          localStorage.removeItem('vyhbz_contact_details');
          return { email: '', phone: parsed.phone || '' };
        }
        return { email: parsed.email || '', phone: parsed.phone || '' };
      }
    }
  } catch {}
  return { email: '', phone: '' };
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