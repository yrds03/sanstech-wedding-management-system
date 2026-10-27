/**
 * Server-Side Rate Limiter & Security Guard
 * ----------------------------------------------------------------------------
 * Melindungi endpoint sensitif (login, RSVP publik, scan QR, import tamu, admin)
 * dari brute-force dan enumerasi token (PRD Bab 13 Poin 6).
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const globalRateStore = globalThis as unknown as {
  __sanstechRateLimiter?: Map<string, RateLimitBucket>;
};

function getBuckets(): Map<string, RateLimitBucket> {
  if (!globalRateStore.__sanstechRateLimiter) {
    globalRateStore.__sanstechRateLimiter = new Map();
  }
  return globalRateStore.__sanstechRateLimiter;
}

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const buckets = getBuckets();
  const now = Date.now();
  const existing = buckets.get(params.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, params.limit - 1),
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= params.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, params.limit - existing.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Validasi Origin / Host untuk mutasi form dan API guna mencegah serangan CSRF lintas situs.
 */
export function verifySameOriginMutation(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) {
    // Form POST dalam browser modern mengirim Origin; izinkan dalam test runner lokal tanpa header
    return true;
  }
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

