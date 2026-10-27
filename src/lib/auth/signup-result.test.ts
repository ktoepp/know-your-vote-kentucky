import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthRedirectPath } from '../auth-redirect';
import { signupUiState, verifyRedirectUrl } from './signup-result';

describe('signupUiState', () => {
  test('returns "error" when signUp returns an error', () => {
    assert.equal(signupUiState({ session: null, error: new Error('rate limited') }), 'error');
  });

  test('returns "error" even if a session is also present', () => {
    assert.equal(
      signupUiState({ session: { access_token: 'dummy' }, error: { message: 'x' } }),
      'error',
    );
  });

  test('returns "signed-in" when signUp returns a session and no error', () => {
    assert.equal(signupUiState({ session: { access_token: 'dummy' }, error: null }), 'signed-in');
  });

  test('returns "check-email" when signUp returns no session and no error', () => {
    assert.equal(signupUiState({ session: null, error: null }), 'check-email');
  });

  test('treats an undefined session as "check-email"', () => {
    assert.equal(signupUiState({ session: undefined, error: undefined }), 'check-email');
  });
});

describe('verifyRedirectUrl', () => {
  test('points at /auth/verify with no query when there is no return path', () => {
    assert.equal(verifyRedirectUrl('https://example.com', ''), 'https://example.com/auth/verify');
    assert.equal(verifyRedirectUrl('https://example.com/', null), 'https://example.com/auth/verify');
  });

  test('carries a safe return path as an encoded next parameter', () => {
    assert.equal(
      verifyRedirectUrl('https://example.com', '/bills/123?tab=votes'),
      'https://example.com/auth/verify?next=%2Fbills%2F123%3Ftab%3Dvotes',
    );
  });

  test('drops unsafe return paths when combined with safeAuthRedirectPath', () => {
    for (const unsafe of ['https://evil.example', '//evil.example', '/auth/login', 'bills']) {
      assert.equal(
        verifyRedirectUrl('https://example.com', safeAuthRedirectPath(unsafe, '')),
        'https://example.com/auth/verify',
      );
    }
  });
});
