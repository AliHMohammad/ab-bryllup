import { expect, test } from '@playwright/test';

/**
 * Del billeder, og alt det der skal holde siden ulistet og delbar.
 */

const SHARE_URL = 'https://join.once.film/f/Mu4oCyqC';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/guestbook', (route) =>
    route.fulfill({ json: { entries: [] } }),
  );
  await page.goto('/');
});

test.describe('del billeder', () => {
  test('viser en QR-kode med tekst til skærmlæsere', async ({ page }) => {
    const qr = page.locator('#billeder [data-qr]');
    await qr.scrollIntoViewIfNeeded();
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('role', 'img');
    await expect(qr).toHaveAttribute('aria-label', /QR-kode/);
    await expect(qr.locator('svg')).toHaveCount(1);

    // Koden skal være stor nok til at kunne scannes fra en skærm.
    const box = await qr.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(200);
  });

  test('linket peger på upload-siden og åbner i ny fane', async ({ page }) => {
    const links = page.locator(`#billeder a[href="${SHARE_URL}"]`);
    await expect(links).toHaveCount(2);

    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }

    await expect(
      page.getByRole('link', { name: 'Del dine billeder' }),
    ).toBeVisible();
  });

  test('viser adressen som tekst, hvis QR-koden ikke kan bruges', async ({
    page,
  }) => {
    await expect(page.locator('#billeder')).toContainText(
      'join.once.film/f/Mu4oCyqC',
    );
  });
});

test.describe('privatliv', () => {
  test('siden beder søgemaskiner om at holde sig væk', async ({ page }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  test('robots.txt afviser alle crawlere', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /');
  });

  test('serveren sender noindex som header', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-robots-tag']).toContain('noindex');
  });

  test('sikkerhedsheaders er på plads', async ({ request }) => {
    const headers = (await request.get('/')).headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['referrer-policy']).toBeTruthy();
    expect(headers['permissions-policy']).toBeTruthy();
  });

  test('ingen hemmeligheder lækker til browseren', async ({ page }) => {
    const html = await page.content();
    for (const secret of ['APPS_SCRIPT', 'test-secret', 'script.google.com']) {
      expect(html).not.toContain(secret);
    }
  });
});

test.describe('deling', () => {
  test('har titel, beskrivelse og billede til beskeder', async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /Ali & Berfin/,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute('content', /bryllup/i);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /og\.png$/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      'da_DK',
    );
  });

  test('delebilledet findes og kan hentes', async ({ page, request }) => {
    const src = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');

    const res = await request.get(new URL(src!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('beskriver brylluppet maskinlæsbart', async ({ page }) => {
    const raw = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    const data = JSON.parse(raw!);

    expect(data['@type']).toBe('Event');
    expect(data.startDate).toBe('2026-12-12T16:00:00+01:00');
    expect(data.location.name).toBe('Nisa Event Center');
    expect(data.location.address.streetAddress).toBe('Vejleåvej 56');
    expect(data.location.address.postalCode).toBe('2635');
  });
});
