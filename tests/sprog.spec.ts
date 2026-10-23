import { expect, test } from '@playwright/test';

/**
 * Sprogvælgeren: siden er på dansk, men kan skiftes til engelsk og tilbage.
 * Valget huskes til næste besøg.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/guestbook', (route) =>
    route.fulfill({ json: { entries: [] } }),
  );
  await page.goto('/');
});

const option = (page: import('@playwright/test').Page, name: string) =>
  page.locator('[data-lang-toggle]').getByRole('button', { name });

test.describe('sprogvælger', () => {
  test('starter på dansk', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'da');
    await expect(option(page, 'Dansk')).toHaveAttribute('aria-pressed', 'true');
    await expect(option(page, 'English')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('er synlig og nem at ramme på alle skærme', async ({ page }) => {
    for (const name of ['Dansk', 'English']) {
      const button = option(page, name);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(36);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('skifter teksterne til engelsk', async ({ page }) => {
    await option(page, 'English').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(option(page, 'English')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveTitle('Ali & Berfin — 12 December 2026');

    const hero = page.locator('#top');
    await expect(hero.getByText('Saturday 12 December 2026')).toBeVisible();
    await expect(
      hero.getByText('Nisa Event Center · Ishøj · at 16:00'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'See the programme' }),
    ).toBeVisible();

    await expect(page.locator('#program h2')).toHaveText('Programme');
    await expect(page.locator('#program ol > li h3').first()).toHaveText(
      'Welcome',
    );
    await expect(page.locator('#sted').getByText('By train')).toBeVisible();
    await expect(page.getByText('There are no messages yet.')).toBeVisible();
    await expect(page.getByLabel('Your name')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeVisible();
  });

  test('oversætter attributter og nedtællingen', async ({ page }) => {
    await option(page, 'English').click();

    await expect(page.locator('#billeder [data-qr]')).toHaveAttribute(
      'aria-label',
      'QR code that opens the page where you can share photos',
    );
    await expect(page.locator('#billeder h2')).toHaveText('Share photos');
    await expect(
      page.getByRole('link', { name: 'Share your photos' }),
    ).toBeVisible();
    await expect(page.locator('#sted iframe')).toHaveAttribute(
      'title',
      /^Map showing Nisa Event Center/,
    );

    const days = page.locator('[data-unit="days"]');
    const value = Number(await days.locator('[data-value]').textContent());
    await expect(days.locator('[data-label]')).toHaveText(
      value === 1 ? 'day' : 'days',
    );
    await expect(page.locator('[data-countdown-sr]')).toContainText(
      'until the wedding',
    );
  });

  test('kan skiftes tilbage til dansk', async ({ page }) => {
    await option(page, 'English').click();
    await expect(page.locator('#program h2')).toHaveText('Programme');

    await option(page, 'Dansk').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'da');
    await expect(page.locator('#program h2')).toHaveText('Program');
    await expect(page.getByText('Der er ingen hilsner endnu.')).toBeVisible();
    await expect(page).toHaveTitle('Ali & Berfin — 12. december 2026');
  });

  test('husker valget ved næste besøg', async ({ page }) => {
    await option(page, 'English').click();
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#program h2')).toHaveText('Programme');
    await expect(option(page, 'English')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('mobilmenuen følger sproget', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobil', 'menuen vises kun på mobil');

    await option(page, 'English').click();
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('[data-menu-link]')).toHaveText([
      'Programme',
      'Share photos',
      'Guestbook',
      'Venue',
    ]);
  });

  test('intet vandret overløb på en smal skærm', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobil', 'kun relevant på mobil');

    await page.setViewportSize({ width: 320, height: 720 });
    for (const name of ['English', 'Dansk']) {
      await option(page, name).click();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
      await expect(option(page, name)).toBeInViewport();
    }
  });
});
