/**
 * Maps a Supabase `auth.signUp` result to the state the register page shows.
 *
 * - `'error'`: Supabase returned an error.
 * - `'signed-in'`: Supabase returned a session with the signup (only when the
 *   project does not require email confirmation).
 * - `'check-email'`: no session yet. The account is finished from the link in
 *   the confirmation email.
 */
export type SignupUiState = 'signed-in' | 'check-email' | 'error';

export interface SignupResultLike {
  session: unknown | null | undefined;
  error: unknown | null | undefined;
}

export function signupUiState({ session, error }: SignupResultLike): SignupUiState {
  if (error) return 'error';
  if (session) return 'signed-in';
  return 'check-email';
}

/**
 * The `/auth/verify` URL used as `emailRedirectTo` for signup and resend links.
 * `safeNext` must already be the output of `safeAuthRedirectPath`; an empty
 * value means "no return path".
 */
export function verifyRedirectUrl(origin: string, safeNext: string | null | undefined): string {
  const base = `${origin.replace(/\/$/, '')}/auth/verify`;
  return safeNext ? `${base}?next=${encodeURIComponent(safeNext)}` : base;
}
