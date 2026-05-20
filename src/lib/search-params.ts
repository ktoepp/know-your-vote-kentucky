export type SearchParamsInput = Record<string, string | string[] | undefined>;

export function searchParamsToUrlSearchParams(input: SearchParamsInput): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') p.set(key, value);
    else if (Array.isArray(value) && typeof value[0] === 'string') p.set(key, value[0]);
  }
  return p;
}
