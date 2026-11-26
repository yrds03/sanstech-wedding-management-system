// Leave room below Vercel's 4.5 MB incoming body limit.
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

/** HTML forms normalize textarea line breaks before percent-encoding UTF-8. */
export function encodedFormSize(fields: Record<string, string>): number {
  const normalized = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.replace(/\r\n|\r|\n/g, '\r\n')]));
  return new URLSearchParams(normalized).toString().length;
}
