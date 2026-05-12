/**
 * Relative path only; blocks open redirects and post-login loops back into auth routes.
 */
export function safeAuthRedirectPath(
  next: string | null | undefined,
  fallback = '/profile',
): string {
  if (next == null || typeof next !== 'string') return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.startsWith('/auth')) return fallback;
  return trimmed;
}
