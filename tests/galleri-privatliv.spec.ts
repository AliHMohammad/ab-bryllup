import { expect, test } from '@playwright/test';

/**
 * Galleri, lightbox og alt det der skal holde siden ulistet og delbar.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/guestbook', (route) =>
    route.fulfill({ json: { entries: [] } }),
  );
  await page.goto('/');
});

test.describe('galleri', () => {
  test('viser alle billeder med beskrivende alt-tekst', async ({ page }) => {
    const images = page.locator('#galleri ul img');
    await expect(images).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt?.length ?? 0).toBeGreaterThan(10);
    }
  });

  test('billederne serveres i moderne format og flere størrelser', async ({
    page,
  }) => {
    const first = page.locator('#galleri ul img').first();
    await expect(first).toHaveAttribute('srcset', /webp/);
    await expect(first).toHaveAttribute('srcset', /\d+w/);
  });

  test('kun de øverste billeder hentes med det samme', async ({ page }) => {
    const images = page.locator('#galleri ul img');
    const loading = await images.evaluateAll((els) =>
      els.map((el) => el.getAttribute('loading')),
    );

    // De to første er synlige med det samme; resten venter til de scrolles frem.
    expect(loading).toEqual(['eager', 'eager', 'lazy', 'lazy', 'lazy', 'lazy']);
  });

  test('billederne indlæses rent faktisk', async ({ page }) => {
    const first = page.locator('#galleri ul img').first();
    await first.scrollIntoViewIfNeeded();

    await expect
      .poll(() => first.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });
});

test.describe('lightbox', () => {
  const open = async (page: import('@playwright/test').Page, index = 0) => {
    await page.locator('#galleri').scrollIntoViewIfNeeded();
    await page.locator(`[data-lightbox-open][data-index="${index}"]`).click();
    await expect(page.locator('[data-lightbox]')).toHaveAttribute('open', '');
  };

  test('åbner det billede man klikker på', async ({ page }) => {
    const thumbAlt = await page
      .locator('#galleri ul img')
      .nth(2)
      .getAttribute('alt');

    await open(page, 2);
    await expect(page.locator('[data-lightbox-image]')).toHaveAttribute(
      'alt',
      thumbAlt!,
    );
  });

  test('bladrer frem og tilbage', async ({ page }) => {
    await open(page, 0);
    const image = page.locator('[data-lightbox-image]');
    const first = await image.getAttribute('alt');

    await page.locator('[data-lightbox-next]').click();
    await expect(image).not.toHaveAttribute('alt', first!);
    const second = await image.getAttribute('alt');

    await page.locator('[data-lightbox-prev]').click();
    await expect(image).toHaveAttribute('alt', first!);
    expect(second).not.toBe(first);
  });

  test('bladrer rundt i ring', async ({ page }) => {
    await open(page, 0);
    const image = page.locator('[data-lightbox-image]');
    const first = await image.getAttribute('alt');

    // Baglæns fra det første billede skal lande på det sidste.
    await page.locator('[data-lightbox-prev]').click();
    const last = await image.getAttribute('alt');
    expect(last).not.toBe(first);

    await page.locator('[data-lightbox-next]').click();
    await expect(image).toHaveAttribute('alt', first!);
  });

  test('lukkes med knappen og giver fokus tilbage', async ({ page }) => {
    await open(page, 1);
    await page.locator('[data-lightbox-close]').click();

    await expect(page.locator('[data-lightbox]')).not.toHaveAttribute(
      'open',
      '',
    );
    await expect(
      page.locator('[data-lightbox-open][data-index="1"]'),
    ).toBeFocused();
  });

  test('lukkes med Escape og frigiver sidescroll', async ({ page }) => {
    await open(page, 0);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-lightbox]')).not.toHaveAttribute(
      'open',
      '',
    );
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('knapperne har tekst til skærmlæsere', async ({ page }) => {
    await open(page, 0);
    for (const name of ['Luk billede', 'Forrige billede', 'Næste billede']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
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
