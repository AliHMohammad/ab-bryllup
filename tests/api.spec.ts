import { expect, test } from '@playwright/test';
import {
  approvedEntry,
  mockRows,
  resetBackend,
  seedMock,
  setMockFailure,
} from './support/helpers';

/**
 * Kontrakt for /api/guestbook (Netlify-funktionen).
 * Kører uden browser — vi tester funktionen direkte.
 */

const post = (data: unknown) => ({
  data,
  headers: { 'Content-Type': 'application/json' },
});

test.describe('gæstebog-api', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
  });

  test('GET returnerer tom liste når der ikke er hilsner', async ({
    request,
  }) => {
    const res = await request.get('/api/guestbook');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ entries: [] });
  });

  test('GET viser kun godkendte hilsner, nyeste først', async ({ request }) => {
    await seedMock(request, [
      approvedEntry('Mormor', 'Tillykke!', '2026-01-01T10:00:00.000Z'),
      { ...approvedEntry('Onkel', 'Ikke godkendt endnu'), approved: false },
      approvedEntry('Farmor', 'Vi glæder os', '2026-02-01T10:00:00.000Z'),
    ]);

    const res = await request.get('/api/guestbook');
    const { entries } = (await res.json()) as {
      entries: { name: string }[];
    };

    expect(entries.map((e) => e.name)).toEqual(['Farmor', 'Mormor']);
    expect(JSON.stringify(entries)).not.toContain('Onkel');
  });

  test('gyldig hilsen gemmes og svarer 201', async ({ request }) => {
    const res = await request.post(
      '/api/guestbook',
      post({ name: 'Ali', message: 'Hej fra testen' }),
    );

    expect(res.status()).toBe(201);
    expect(await res.json()).toEqual({ ok: true });

    const rows = await mockRows(request);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Ali', message: 'Hej fra testen' });
  });

  test('nye hilsner er ikke godkendt og kræver manuel moderation', async ({
    request,
  }) => {
    await request.post(
      '/api/guestbook',
      post({ name: 'Ukendt', message: 'Skal modereres' }),
    );

    const rows = await mockRows(request);
    expect(rows[0].approved).toBe(false);

    // Den må ikke dukke op i det offentlige svar endnu.
    const res = await request.get('/api/guestbook');
    expect(await res.json()).toEqual({ entries: [] });
  });

  test('funktionen sender den hemmelige nøgle med til Apps Script', async ({
    request,
  }) => {
    await request.post(
      '/api/guestbook',
      post({ name: 'Ali', message: 'Med nøgle' }),
    );

    const rows = await mockRows(request);
    expect(rows[0].secretOk).toBe(true);
  });

  test('honeypot afvises stille og når aldrig frem til arket', async ({
    request,
  }) => {
    const res = await request.post(
      '/api/guestbook',
      post({ name: 'Bot', message: 'spam', website: 'http://spam.example' }),
    );

    // 200 og ikke 400, så botten ikke lærer at fælden findes.
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await mockRows(request)).toHaveLength(0);
  });

  test('manglende felter afvises med dansk fejlbesked', async ({ request }) => {
    for (const body of [
      { name: '', message: 'Uden navn' },
      { name: 'Uden hilsen', message: '' },
      { name: '   ', message: '   ' },
      {},
    ]) {
      const res = await request.post('/api/guestbook', post(body));
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({
        error: 'Navn og hilsen skal udfyldes.',
      });
    }
    expect(await mockRows(request)).toHaveLength(0);
  });

  test('for lange felter afvises', async ({ request }) => {
    for (const body of [
      { name: 'a'.repeat(81), message: 'ok' },
      { name: 'ok', message: 'a'.repeat(801) },
    ]) {
      const res = await request.post('/api/guestbook', post(body));
      expect(res.status()).toBe(400);
      expect(await res.json()).toEqual({ error: 'Teksten er for lang.' });
    }
    expect(await mockRows(request)).toHaveLength(0);
  });

  test('felter på præcis grænsen accepteres', async ({ request }) => {
    const res = await request.post(
      '/api/guestbook',
      post({ name: 'a'.repeat(80), message: 'b'.repeat(800) }),
    );
    expect(res.status()).toBe(201);
  });

  test('ugyldig JSON afvises', async ({ request }) => {
    // Buffer, fordi Playwright ellers ville pakke teksten ind som gyldig JSON.
    const res = await request.post('/api/guestbook', {
      data: Buffer.from('{det her er ikke json'),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Ugyldigt format.' });
  });

  test('gyldig JSON der ikke er et objekt afvises pænt', async ({
    request,
  }) => {
    // `null` fik tidligere funktionen til at svare 500 med en stak-udskrift.
    for (const raw of ['null', '42', '"tekst"', '[1,2]']) {
      const res = await request.post('/api/guestbook', {
        data: Buffer.from(raw),
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await res.text();

      expect(res.status(), `body: ${raw}`).toBe(400);
      expect(text).not.toContain('TypeError');
      expect(text).not.toContain('at Object');
    }
    expect(await mockRows(request)).toHaveLength(0);
  });

  test('andre metoder end GET og POST afvises', async ({ request }) => {
    for (const method of ['put', 'delete', 'patch'] as const) {
      const res = await request[method]('/api/guestbook');
      expect(res.status()).toBe(405);
      expect(await res.json()).toEqual({
        error: 'Metoden understøttes ikke.',
      });
    }
  });

  test('hastighedsgrænsen tillader 5 og blokerer derefter', async ({
    request,
  }) => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request.post(
        '/api/guestbook',
        post({ name: `Gæst ${i}`, message: 'Tillykke' }),
      );
      codes.push(res.status());
    }

    expect(codes).toEqual([201, 201, 201, 201, 201, 429, 429]);

    const blocked = await request.post(
      '/api/guestbook',
      post({ name: 'Spammer', message: 'igen' }),
    );
    expect(await blocked.json()).toEqual({
      error: 'For mange forsøg. Prøv igen om lidt.',
    });

    // De blokerede forsøg må ikke være havnet i arket.
    expect(await mockRows(request)).toHaveLength(5);
  });

  test('GET fejler blødt hvis Apps Script er nede', async ({ request }) => {
    await setMockFailure(request, 'error');
    const res = await request.get('/api/guestbook');

    // Siden skal stadig kunne vises — bare uden hilsner.
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ entries: [] });
  });

  test('POST melder fejl hvis Apps Script er nede', async ({ request }) => {
    await setMockFailure(request, 'error');
    const res = await request.post(
      '/api/guestbook',
      post({ name: 'Ali', message: 'Når ikke frem' }),
    );

    expect(res.status()).toBe(502);
    expect(await res.json()).toEqual({ error: 'Hilsenen kunne ikke gemmes.' });
  });

  test('svar må ikke caches', async ({ request }) => {
    const res = await request.get('/api/guestbook');
    expect(res.headers()['cache-control']).toBe('no-store');
  });
});
