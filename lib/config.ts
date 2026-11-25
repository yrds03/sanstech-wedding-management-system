/** Demo storage and identities are strictly local. Never enable them on a hosted deployment. */
export function isLocalDemoEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL &&
    (process.env.LOCAL_DEMO_MODE === 'true' || process.env.VITEST === 'true');
}

export function safeRedirectPath(value: unknown, fallback = '/app/workspaces'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://internal.invalid');
    return url.origin === 'https://internal.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
