/**
 * Utility functions for NextGen Class
 */

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString?: string | Date | null): string {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'Super Admin':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Programme Manager':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'M&E Manager':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'Facilitator':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Learner':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Applicant':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

/**
 * Recursively removes keys with `undefined` values from an object or array.
 * Firestore throws errors when receiving `undefined` for field values.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanObj[key] = cleanFirestoreData(value);
      }
    }
    return cleanObj as T;
  }
  return obj;
}
