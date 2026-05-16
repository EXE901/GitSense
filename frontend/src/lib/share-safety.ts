const blockedQueryKeys = new Set([
  'access_token',
  'auth',
  'code',
  'email',
  'expires',
  'guest_session_id',
  'id_token',
  'jwt',
  'refresh_token',
  'secret',
  'session',
  'sid',
  'state',
  'token',
  'verify_token',
]);

const allowedShareQueryKeys = new Set([
  'repo',
  'state',
  'page',
  'limit',
  'sort_by',
  'sort_direction',
  'view',
  'share_preview',
]);

const safeRoutePattern = /^\/[a-z0-9/_?=&.%#+-]*$/i;

export function sanitizeText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

export function sanitizeMarkdown(value: unknown): string {
  return sanitizeText(value)
    .replace(/[<>]/g, '')
    .replace(/([\\`*_{}\[\]()#+.!|-])/g, '\\$1');
}

export function sanitizeCsvCell(value: unknown): string {
  const text = sanitizeText(value).replace(/"/g, '""');
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;

  if (/[",\n]/.test(guarded)) {
    return `"${guarded}"`;
  }

  return guarded;
}

export function sanitizeFilename(value: string): string {
  return value
    .replace(/[^a-z0-9._-]/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

export function safeRouteHref(value: unknown, fallback = '/dashboard'): string {
  const route = sanitizeText(value, fallback);

  if (!safeRoutePattern.test(route)) {
    return fallback;
  }

  try {
    const url = new URL(route, 'https://gitsense.local');

    for (const key of Array.from(url.searchParams.keys())) {
      if (blockedQueryKeys.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function safeExternalHref(value: unknown, fallback = '/issues'): string {
  const href = sanitizeText(value);

  if (!href) {
    return fallback;
  }

  try {
    const url = new URL(href);

    for (const key of Array.from(url.searchParams.keys())) {
      if (blockedQueryKeys.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    if (url.hostname === 'github.com' || url.hostname.endsWith('.github.com')) {
      return url.toString();
    }
  } catch {
    return safeRouteHref(href, fallback);
  }

  return fallback;
}

export function buildSafeShareUrl(currentHref: string, extraParams?: Record<string, string>): string {
  const url = new URL(currentHref);
  const safeUrl = new URL(url.pathname, url.origin);

  url.searchParams.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();

    if (allowedShareQueryKeys.has(normalizedKey) && !blockedQueryKeys.has(normalizedKey)) {
      safeUrl.searchParams.set(normalizedKey, sanitizeText(value).slice(0, 120));
    }
  });

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      const normalizedKey = key.toLowerCase();

      if (allowedShareQueryKeys.has(normalizedKey)) {
        safeUrl.searchParams.set(normalizedKey, sanitizeText(value).slice(0, 120));
      }
    });
  }

  return safeUrl.toString();
}

export function readStringArrayFromStorage(key: string): string[] {
  try {
    const rawValue = window.localStorage.getItem(key);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsedValue)) {
      window.localStorage.removeItem(key);
      return [];
    }

    return parsedValue
      .filter((item): item is string => typeof item === 'string')
      .map((item) => sanitizeText(item))
      .filter(Boolean)
      .slice(0, 200);
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}
