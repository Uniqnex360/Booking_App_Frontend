import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatApiErrorMessage(err: any, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const detail = err.response?.data?.detail ?? err.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if (item.msg) {
            const loc = Array.isArray(item.loc)
              ? item.loc.filter((part: any) => part !== 'body').join('.')
              : '';
            return loc ? `${loc}: ${item.msg}` : item.msg;
          }
          return JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join('; ');
  }

  if (detail && typeof detail === 'object') {
    if (detail.msg) return String(detail.msg);
    if (detail.message) return String(detail.message);
  }

  const message = err.response?.data?.message ?? err.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
