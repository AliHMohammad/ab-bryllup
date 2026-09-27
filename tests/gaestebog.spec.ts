import { expect, test } from '@playwright/test';
import {
  approvedEntry,
  mockRows,
  resetBackend,
  seedMock,
} from './support/helpers';

/**
 * Gæstebogen i browseren — formular, validering, moderation og sikkerhed.
 */

const goto = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.locator('#gaestebog').scrollIntoViewIfNeeded();
};

test.beforeEach(async ({ request }) => {
  await resetBackend(request);
});

test.describe('visning af hilsner', () => {
  test('viser en tom-besked når der ingen hilsner er', async ({ page }) => {
    await goto(page);
    await expect(
      page.getByText(
        'Der er ingen hilsner endnu. Bliv den første til at skrive.',
      ),
    ).toBeVisible();
  });

  test('viser godkendte hilsner med navn og dato', async ({
    page,
    request,
  }) => {
    await seedMock(request, [
      approvedEntry('Mormor', 'Tillykke I to!', '2026-01-15T12:00:00.000Z'),
    ]);
    await goto(page);

    const entry = page.locator('[data-guestbook-list] li').first();
    await expect(entry.locator('[data-entry-name]')).toHaveText('Mormor');
    await expect(entry.locator('[data-entry-message]')).toHaveText(
      'Tillykke I to!',
    );
    // Dansk datoformat.
    await expect(entry.locator('[data-entry-date]')).toContainText('januar');
  });

  test('viser aldrig hilsner der ikke er godkendt', async ({
    page,
    request,
  }) => {
    await seedMock(request, [
      approvedEntry('Godkendt', 'Denne må gerne vises'),
      { ...approvedEntry('Afventer', 'HEMMELIG-TEKST'), approved: false },
    ]);
    await goto(page);

    await expect(page.locator('[data-guestbook-list]')).toContainText(
      'Godkendt',
    );
    await expect(page.locator('#gaestebog')).not.toContainText(
      'HEMMELIG-TEKST',
    );
  });

  test('siden fungerer stadig hvis gæstebogen fejler', async ({ page }) => {
    await page.route('**/api/guestbook', (route) =>
      route.fulfill({ status: 500, json: { error: 'nede' } }),
    );
    await goto(page);

    // Ingen fejl i brugerens ansigt — bare den tomme tilstand.
    await expect(page.locator('#gaestebog')).toBeVisible();
    await expect(page.getByText('Der er ingen hilsner endnu.')).toBeVisible();
  });
});

test.describe('indsendelse', () => {
  test('sender en hilsen og kvitterer på dansk', async ({ page, request }) => {
    await goto(page);

    await page.getByLabel('Dit navn').fill('Ali');
    await page.getByLabel('Din hilsen').fill('Vi glæder os!');
    await page.getByRole('button', { name: 'Send hilsen' }).click();

    await expect(page.locator('[data-form-status]')).toHaveText(
      'Tusind tak for din hilsen! Den vises på siden, så snart vi har set den.',
    );

    const rows = await mockRows(request);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Ali', message: 'Vi glæder os!' });
  });

  test('rydder formularen efter en vellykket indsendelse', async ({ page }) => {
    await goto(page);

    await page.getByLabel('Dit navn').fill('Ali');
    await page.getByLabel('Din hilsen').fill('Tillykke');
    await page.getByRole('button', { name: 'Send hilsen' }).click();

    await expect(page.locator('[data-form-status]')).toContainText(
      'Tusind tak',
    );
    await expect(page.getByLabel('Dit navn')).toHaveValue('');
    await expect(page.getByLabel('Din hilsen')).toHaveValue('');
  });

  test('kræver navn og hilsen', async ({ page, request }) => {
    await goto(page);
    await page.getByRole('button', { name: 'Send hilsen' }).click();

    await expect(page.locator('[data-error-for="name"]')).toHaveText(
      'Skriv venligst dit navn.',
    );
    await expect(page.locator('[data-error-for="message"]')).toHaveText(
      'Skriv venligst en hilsen.',
    );

    // Intet må være sendt afsted.
    expect(await mockRows(request)).toHaveLength(0);
  });

  test('fejlbeskeden forsvinder når feltet udfyldes', async ({ page }) => {
    await goto(page);
    await page.getByRole('button', { name: 'Send hilsen' }).click();
    await expect(page.locator('[data-error-for="name"]')).toBeVisible();

    await page.getByLabel('Dit navn').fill('Ali');
    await page.getByLabel('Din hilsen').fill('Tillykke');
    await page.getByRole('button', { name: 'Send hilsen' }).click();

    await expect(page.locator('[data-error-for="name"]')).toBeHidden();
  });

  test('viser en fejlbesked hvis serveren svarer med fejl', async ({
    page,
  }) => {
    await goto(page);
    await page.route('**/api/guestbook', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 502, json: { error: 'nede' } })
        : route.fulfill({ json: { entries: [] } }),
    );

    await page.getByLabel('Dit navn').fill('Ali');
    await page.getByLabel('Din hilsen').fill('Tillykke');
    await page.getByRole('button', { name: 'Send hilsen' }).click();

    await expect(page.locator('[data-form-status]')).toHaveText(
      'Noget gik galt, og din hilsen blev ikke sendt. Prøv venligst igen om lidt.',
    );
  });

  test('statusbeskeden læses op af skærmlæsere', async ({ page }) => {
    await goto(page);
    const status = page.locator('[data-form-status]');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
  });

  test('felterne er koblet til deres etiketter', async ({ page }) => {
    await goto(page);
    await expect(page.getByLabel('Dit navn')).toHaveAttribute('name', 'name');
    await expect(page.getByLabel('Din hilsen')).toHaveAttribute(
      'name',
      'message',
    );
  });

  test('felterne har en øvre grænse', async ({ page }) => {
    await goto(page);
    await expect(page.getByLabel('Dit navn')).toHaveAttribute(
      'maxlength',
      '80',
    );
    await expect(page.getByLabel('Din hilsen')).toHaveAttribute(
      'maxlength',
      '800',
    );
  });
});

test.describe('botfælde', () => {
  test('honeypot-feltet er skjult for rigtige gæster', async ({ page }) => {
    await goto(page);
    const honeypot = page.locator('#gb-website');

    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('autocomplete', 'off');

    // Placeret uden for skærmen og skjult for skærmlæsere.
    const box = await honeypot.boundingBox();
    expect(box!.x).toBeLessThan(0);
    await expect(
      page.locator('#gb-website').locator('xpath=ancestor::div[1]'),
    ).toHaveAttribute('aria-hidden', 'true');
  });

  test('udfyldt honeypot stopper indsendelsen', async ({ page, request }) => {
    await goto(page);

    await page.getByLabel('Dit navn').fill('Bot');
    await page.getByLabel('Din hilsen').fill('spam spam');
    await page
      .locator('#gb-website')
      .fill('http://spam.example', { force: true });
    await page.getByRole('button', { name: 'Send hilsen' }).click();

    await expect(page.locator('[data-form-status]')).toContainText(
      'Tusind tak',
    );

    // Botten tror den slap igennem, men intet blev gemt.
    expect(await mockRows(request)).toHaveLength(0);
  });
});

test.describe('sikkerhed', () => {
  test('hilsner med HTML vises som tekst og køres ikke', async ({
    page,
    request,
  }) => {
    const alerts: string[] = [];
    page.on('dialog', (dialog) => {
      alerts.push(dialog.message());
      void dialog.dismiss();
    });

    await seedMock(request, [
      approvedEntry(
        '<script>window.__xss = true;</script>Farmor',
        '<img src=x onerror="window.__xss = true"> Tillykke!',
      ),
    ]);
    await goto(page);

    const entry = page.locator('[data-guestbook-list] li').first();
    await expect(entry).toBeVisible();

    // Ingen injicerede elementer.
    const injected = await page.evaluate(() => ({
      images: document.querySelectorAll('[data-guestbook-list] img').length,
      scripts: document.querySelectorAll('[data-guestbook-list] script').length,
      flag: (window as unknown as { __xss?: boolean }).__xss ?? false,
    }));

    expect(injected).toEqual({ images: 0, scripts: 0, flag: false });
    expect(alerts).toHaveLength(0);

    // Teksten vises ordret, som gæsten skrev den.
    await expect(entry.locator('[data-entry-name]')).toContainText('<script>');
  });

  test('linjeskift bevares uden at bruge HTML', async ({ page, request }) => {
    await seedMock(request, [
      approvedEntry('Mormor', 'Første linje\nAnden linje'),
    ]);
    await goto(page);

    const message = page.locator('[data-entry-message]').first();
    await expect(message).toHaveText('Første linje\nAnden linje');
    await expect(message).toHaveCSS('white-space', 'pre-line');
    expect(await message.locator('br').count()).toBe(0);
  });
});
