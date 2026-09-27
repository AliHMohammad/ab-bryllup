import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * Proxy mellem siden og Google Apps Script.
 * URL og hemmelighed ligger kun her på serveren — aldrig i browseren.
 */

const MAX_NAME = 80;
const MAX_MESSAGE = 800;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const json = (body: unknown, statusCode: number) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/**
 * Tæller indsendelser pr. IP i Netlify Blobs.
 * Blobs deles på tværs af funktionsinstanser — en tæller i hukommelsen ville
 * blive nulstillet ved hver kold start og derfor reelt ikke begrænse noget.
 */
const isRateLimited = async (ip: string) => {
  try {
    const store = getStore('guestbook-rate-limit');
    const key = encodeURIComponent(ip);
    const now = Date.now();

    const previous = (await store.get(key, { type: 'json' })) as
      number[] | null;
    const recent = (previous ?? []).filter(
      (time) => now - time < RATE_LIMIT_WINDOW_MS,
    );
    recent.push(now);

    await store.setJSON(key, recent);
    return recent.length > RATE_LIMIT_MAX;
  } catch (error) {
    // Blobs utilgængelig — bloker ikke rigtige gæster på grund af det.
    console.warn('Kunne ikke tjekke hastighedsgrænsen:', error);
    return false;
  }
};

const callAppsScript = async (
  payload: Record<string, unknown>,
  secret: string,
  url: string,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, secret }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export default async (request: Request, context: Context) => {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;

  if (!url || !secret) {
    console.error('APPS_SCRIPT_URL eller APPS_SCRIPT_SECRET mangler.');
    return json({ error: 'Gæstebogen er ikke konfigureret.' }, 503);
  }

  if (request.method === 'GET') {
    try {
      const res = await fetch(`${url}?secret=${encodeURIComponent(secret)}`);
      if (!res.ok) throw new Error(`Apps Script svarede ${res.status}`);
      const data = (await res.json()) as { entries?: unknown };
      const entries = Array.isArray(data.entries) ? data.entries : [];
      return json({ entries }, 200);
    } catch (error) {
      console.error('Kunne ikke hente hilsner:', error);
      return json({ entries: [] }, 200);
    }
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metoden understøttes ikke.' }, 405);
  }

  const ip = context.ip || 'ukendt';
  if (await isRateLimited(ip)) {
    return json({ error: 'For mange forsøg. Prøv igen om lidt.' }, 429);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    // `null`, tal, tekst og lister er gyldig JSON, men ikke en hilsen.
    // Uden dette tjek ville et `null`-kald få funktionen til at fejle med 500.
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return json({ error: 'Ugyldigt format.' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'Ugyldigt format.' }, 400);
  }

  // Honeypot: bots udfylder feltet. Vi svarer 200, så de ikke lærer noget.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true }, 200);
  }

  const name = String(body.name ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!name || !message) {
    return json({ error: 'Navn og hilsen skal udfyldes.' }, 400);
  }
  if (name.length > MAX_NAME || message.length > MAX_MESSAGE) {
    return json({ error: 'Teksten er for lang.' }, 400);
  }

  try {
    const res = await callAppsScript(
      {
        name: name.slice(0, MAX_NAME),
        message: message.slice(0, MAX_MESSAGE),
        submittedAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent')?.slice(0, 200) ?? '',
      },
      secret,
      url,
    );

    if (!res.ok) throw new Error(`Apps Script svarede ${res.status}`);
    return json({ ok: true }, 201);
  } catch (error) {
    console.error('Kunne ikke gemme hilsen:', error);
    return json({ error: 'Hilsenen kunne ikke gemmes.' }, 502);
  }
};

export const config: Config = {
  path: '/api/guestbook',
};
