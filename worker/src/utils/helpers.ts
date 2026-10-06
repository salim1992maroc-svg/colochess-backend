export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

export function textResponse(text: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
}

export function getClientIp(request: Request): string {
  // Only trust CF-Connecting-IP guaranteed by Cloudflare Edge
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

export async function parseParams(request: Request): Promise<Map<string, string>> {
  const params = new Map<string, string>();

  // 1. Query parameters
  const url = new URL(request.url);
  for (const [key, value] of url.searchParams.entries()) {
    params.set(key, value);
  }

  // 2. Body parameters if POST/PUT
  if (request.method === 'POST' || request.method === 'PUT') {
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        const json = await request.clone().json<Record<string, unknown>>();
        for (const [k, v] of Object.entries(json)) {
          params.set(k, String(v));
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.clone().text();
        const formParams = new URLSearchParams(text);
        for (const [k, v] of formParams.entries()) {
          params.set(k, v);
        }
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.clone().formData();
        for (const [k, v] of formData.entries()) {
          if (typeof v === 'string') {
            params.set(k, v);
          }
        }
      } else {
        // Fallback text form data
        const text = await request.clone().text();
        if (text && text.includes('=')) {
          const formParams = new URLSearchParams(text);
          for (const [k, v] of formParams.entries()) {
            params.set(k, v);
          }
        }
      }
    } catch {
      // Body empty or unparseable, continue with query params
    }
  }

  return params;
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateRandomCode(length = 6): string {
  const chars = '0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function generateReferralCode(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'USER';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName}${rand}`;
}

// Stateless signed token for admin panel session
export async function signAdminToken(username: string, secret: string): Promise<string> {
  const payload = {
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 86400, // 7 days
  };
  const enc = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const message = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'default-colochess-admin-secret-key-32b'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const sigArray = Array.from(new Uint8Array(sig));
  const sigBase64 = btoa(String.fromCharCode.apply(null, sigArray)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${message}.${sigBase64}`;
}

export async function verifyAdminToken(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sigBase64] = parts;
    const message = `${header}.${body}`;
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret || 'default-colochess-admin-secret-key-32b'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binarySig = atob(sigBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(message));
    if (!valid) return null;

    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.sub || null;
  } catch {
    return null;
  }
}
