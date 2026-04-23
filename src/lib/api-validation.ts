import { NextResponse } from 'next/server';

/**
 * Thrown when a request query parameter fails validation.
 * Routes should catch this (or use {@link withValidation}) and return 400.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Parse and clamp a `limit` query parameter.
 *
 * Returns a finite integer in `[1, max]`. If `raw` is null/undefined, returns
 * `opts.default`. Throws {@link ValidationError} for non-numeric, NaN, negative,
 * zero, or non-integer values so callers can surface a 400 response.
 *
 * @example
 *   parseLimit('50',    { default: 20, max: 100 }) // => 50
 *   parseLimit(null,    { default: 20, max: 100 }) // => 20
 *   parseLimit('99999', { default: 20, max: 100 }) // => 100 (clamped)
 *   parseLimit('abc',   { default: 20, max: 100 }) // throws ValidationError
 *   parseLimit('-1',    { default: 20, max: 100 }) // throws ValidationError
 */
export function parseLimit(
  raw: string | null | undefined,
  opts: { default: number; max: number },
): number {
  if (raw === null || raw === undefined || raw === '') {
    return Math.min(Math.max(1, opts.default), opts.max);
  }
  if (!/^-?\d+$/.test(raw)) {
    throw new ValidationError(`Invalid limit: "${raw}" is not an integer`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new ValidationError(`Invalid limit: "${raw}" is not a finite integer`);
  }
  if (n < 1) {
    throw new ValidationError(`Invalid limit: must be >= 1 (got ${n})`);
  }
  return Math.min(n, opts.max);
}

/**
 * Parse and validate an enum-like string query parameter against an allow-list.
 *
 * Returns the matching allow-list value. If `raw` is null/undefined/empty and
 * `opts.allowNull` is true, returns `null`; otherwise throws
 * {@link ValidationError}. Throws for any value not in `allowed`.
 *
 * @example
 *   parseEnum('bills', ['bills','ordinances'] as const, { allowNull: true }) // 'bills'
 *   parseEnum(null,    ['bills','ordinances'] as const, { allowNull: true }) // null
 *   parseEnum('junk',  ['bills','ordinances'] as const, { allowNull: true }) // throws
 */
export function parseEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  opts: { allowNull: boolean },
): T | null {
  if (raw === null || raw === undefined || raw === '') {
    if (opts.allowNull) return null;
    throw new ValidationError(
      `Missing required value; expected one of: ${allowed.join(', ')}`,
    );
  }
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ValidationError(
      `Invalid value "${raw}"; expected one of: ${allowed.join(', ')}`,
    );
  }
  return raw as T;
}

/**
 * Wrap a Next.js route handler so that any {@link ValidationError} thrown
 * synchronously or asynchronously is mapped to a `400 Bad Request` JSON
 * response of the form `{ error: string }`. All other errors propagate.
 *
 * @example
 *   export const GET = withValidation(async (req) => {
 *     const limit = parseLimit(new URL(req.url).searchParams.get('limit'),
 *       { default: 20, max: 100 });
 *     // ...
 *   });
 */
export function withValidation<Args extends any[]>(
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  };
}

