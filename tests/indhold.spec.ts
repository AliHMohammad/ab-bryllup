import { expect, test } from '@playwright/test';

/**
 * Indholdet på siden: overskrifter, program, sted og navigation.
 * Alle tekster kommer fra src/content/wedding.ts.
 */

test.beforeEach(async ({ page }) => {
  // Gæstebogen har sin egen testfil - her holder vi den ude af vejen,
  // så indholdstestene ikke afhænger af netværket.
  await page.route('**/api/guestbook', (route) =>
    route.fulfill({ json: { entries: [] } }),
  );
  await page.goto('/');
});

test.describe('forside', () => {
  test('viser parret, datoen og stedet', async ({ page }) => {
    const hero = page.locator('#top');
    const heading = hero.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Ali');
    await expect(heading).toContainText('Berfin');

    await expect(hero.getByText('Lørdag 12. december 2026')).toBeVisible();
    await expect(
      hero.getByText('Nisa Event Center · Ishøj · kl. 16:00'),
    ).toBeVisible();
  });

  test('har præcis én h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('alle sektioner findes', async ({ page }) => {
    for (const id of ['top', 'program', 'billeder', 'gaestebog', 'sted']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test('siden er på dansk', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'da');
    await expect(page).toHaveTitle('Ali & Berfin - 12. december 2026');
  });

  test('intet vandret overløb', async ({ page }) => {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe('nedtælling', () => {
  test('viser fire enheder med tal', async ({ page }) => {
    const units = page.locator('[data-countdown] [data-unit]');
    await expect(units).toHaveCount(4);

    for (const key of ['days', 'hours', 'minutes', 'seconds']) {
      const value = page.locator(`[data-unit="${key}"] [data-value]`);
      await expect(value).toHaveText(/^\d+$/);
    }
  });

  test('tæller mod den rigtige dato', async ({ page }) => {
    await expect(page.locator('[data-countdown]')).toHaveAttribute(
      'data-target',
      '2026-12-12T16:00:00+01:00',
    );
  });

  test('sekunderne tikker', async ({ page }) => {
    const seconds = page.locator('[data-unit="seconds"] [data-value]');
    const first = await seconds.textContent();
    await expect(seconds).not.toHaveText(first ?? '', { timeout: 3_000 });
  });

  test('bruger dansk ental og flertal', async ({ page }) => {
    const days = page.locator('[data-unit="days"]');
    await expect(days).toHaveAttribute('data-singular', 'dag');
    await expect(days).toHaveAttribute('data-plural', 'dage');

    const label = await days.locator('[data-label]').textContent();
    const value = Number(await days.locator('[data-value]').textContent());
    expect(label?.trim()).toBe(value === 1 ? 'dag' : 'dage');
  });

  test('har en oplæsbar status til skærmlæsere', async ({ page }) => {
    const sr = page.locator('[data-countdown-sr]');
    await expect(sr).toHaveAttribute('aria-live', 'polite');
    await expect(sr).not.toBeEmpty();
  });
});

test.describe('program', () => {
  test('viser alle fem punkter i rækkefølge', async ({ page }) => {
    const items = page.locator('#program ol > li');
    await expect(items).toHaveCount(5);

    await expect(items).toContainText([
      'Velkomst',
      'Brudeparrets entré',
      'Middag',
      'Bryllupskage',
      'Fest',
    ]);
  });

  test('velkomsten står til 16:00', async ({ page }) => {
    const first = page.locator('#program ol > li').first();
    await expect(first).toContainText('16:00');
    await expect(first).toContainText('Velkomst');
  });

  test('alle tidspunkter er bekræftede', async ({ page }) => {
    await expect(page.getByText('Vejledende tidspunkt')).toHaveCount(0);
  });

  test('teksten har plads nok på små skærme', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobil', 'kun relevant på mobil');

    await page.setViewportSize({ width: 320, height: 720 });
    const title = page.locator('#program ol > li h3').first();
    const box = await title.boundingBox();

    // Titlen blev tidligere klemt ned i en smal kolonne.
    expect(box!.width).toBeGreaterThan(180);
  });
});

test.describe('lokation', () => {
  test('viser navn og fuld adresse', async ({ page }) => {
    const section = page.locator('#sted');
    await expect(section).toContainText('Nisa Event Center');
    await expect(section.locator('address')).toContainText('Vejleåvej 56');
    await expect(section.locator('address')).toContainText('2635');
    await expect(section.locator('address')).toContainText('Ishøj');
  });

  test('kortlinks peger på den rigtige adresse', async ({ page }) => {
    const google = page.getByRole('link', { name: /Google Maps/i });
    await expect(google).toHaveAttribute(
      'href',
      /query=Vejle(å|%C3%A5)vej(\+|%20)56.*2635.*Ish/i,
    );
    // Virksomhedsnavnet får Google til at vise en forkert adresse.
    await expect(google).not.toHaveAttribute('href', /Nisa/i);

    const apple = page.getByRole('link', { name: /Apple Maps/i });
    await expect(apple).toHaveAttribute('href', /maps\.apple\.com/);
  });

  test('kortet er centreret på stedet', async ({ page }) => {
    const src = await page.locator('#sted iframe').getAttribute('src');

    // Markøren skal stå på de geokodede koordinater for Vejleåvej 56.
    expect(src).toContain('marker=55.616892');
    expect(src).toContain('12.314681');
  });

  test('kortet aktiveres først ved tryk, så det ikke stjæler scroll', async ({
    page,
  }) => {
    const overlay = page.locator('[data-map-activate]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Tryk for at bruge kortet');

    await overlay.click();
    await expect(overlay).toHaveCount(0);
  });

  test('kortet har en beskrivende titel', async ({ page }) => {
    const title = await page.locator('#sted iframe').getAttribute('title');
    expect(title).toContain('Nisa Event Center');
  });
});

test.describe('navigation', () => {
  test('springer til den valgte sektion', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobil', 'menuen testes separat');

    await page.getByRole('link', { name: 'Sted', exact: true }).click();
    await expect(page).toHaveURL(/#sted$/);
    await expect(page.locator('#sted')).toBeInViewport();
  });

  test('springlinket bliver synligt ved fokus', async ({ page }) => {
    const skip = page.locator('a[href="#indhold"]');

    // Skjult for øjet, men stadig i tilgængelighedstræet.
    const hiddenBox = await skip.boundingBox();
    expect(hiddenBox!.width).toBeLessThan(5);

    await skip.focus();
    await expect(skip).toBeFocused();

    const focusedBox = await skip.boundingBox();
    expect(focusedBox!.width).toBeGreaterThan(80);
  });

  test('springlinket er det første man tabber til', async ({
    page,
  }, testInfo) => {
    // Mobil-WebKit flytter ikke fokus med Tab.
    test.skip(testInfo.project.name !== 'desktop', 'kun på desktop');

    await page.keyboard.press('Tab');
    await expect(page.locator('a[href="#indhold"]')).toBeFocused();
  });

  test('knappen i hero fører til programmet', async ({ page }) => {
    await page.getByRole('link', { name: 'Se programmet' }).click();
    await expect(page.locator('#program')).toBeInViewport();
  });
});

test.describe('mobilmenu', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobil', 'menuen vises kun på mobil');
  });

  test('åbner, navigerer og lukker', async ({ page }) => {
    const toggle = page.locator('[data-menu-toggle]');
    const panel = page.locator('[data-menu-panel]');

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();

    const links = panel.locator('[data-menu-link]');
    await expect(links).toHaveText([
      'Program',
      'Del billeder',
      'Gæstebog',
      'Sted',
    ]);

    await links.nth(3).click();
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(/#sted$/);
  });

  test('låser baggrunden mens menuen er åben', async ({ page }) => {
    const toggle = page.locator('[data-menu-toggle]');

    await toggle.click();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.locator('[data-menu-close]').click();
    await expect(page.locator('[data-menu-panel]')).toBeHidden();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('lukkes med Escape', async ({ page }) => {
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('[data-menu-panel]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-menu-panel]')).toBeHidden();
  });
});
