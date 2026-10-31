import { z } from 'zod';

/**
 * Dangerous route patterns (FR-03). A route whose normalized path matches
 * any of these is `blocked` and never navigated automatically. Matching is
 * case-insensitive substring on the normalized path.
 */
export const DANGEROUS_ROUTE_PATTERNS: readonly string[] = [
  '/logout',
  '/signout',
  '/sign-out',
  '/log-out',
  'logout',
  '/delete',
  '/remove',
  '/destroy',
  '/admin',
  '/wp-admin',
  '/wp-login',
  '/account/delete',
  '/account/close',
  '/checkout',
  '/payment',
  '/billing',
  '/oauth',
  '/auth/callback',
  '/reset-password',
  '/change-password',
];

export function isDangerousRoute(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return DANGEROUS_ROUTE_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

export const ExclusionPatternSchema = z.string().min(1).max(200);
export type ExclusionPattern = z.infer<typeof ExclusionPatternSchema>;
