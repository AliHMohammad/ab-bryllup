# Plan: Bryllupssite — aliogberfin.dk

A Danish, mobile-first, elegant one-page wedding invitation built with **Astro + Tailwind CSS**,
deployed to **Netlify** from day one so there is always a shareable link. Five sections, one small
backend (the guestbook). Countdown targets **12. december 2026, kl. 16:00** at
**Nisa Event Center, Ishøj**.

- **Couple:** Ali Haider Mohammad & Berfin Flora Turan
- **Date/time:** 12. december 2026, kl. 16:00 (Europe/Copenhagen)
- **Venue:** Nisa Event Center, Industrivangen 26, 2635 Ishøj
- **Language:** Danish only
- **Domain:** aliogberfin.dk
- **Privacy:** public URL, unlisted (noindex)

## Steps

### Phase 1 — Scaffold & first deploy (blocks everything)

1. Initialise Astro 5 with TypeScript, add Tailwind CSS v4, Prettier and a `.nvmrc`.
   Set `output: 'static'`, `site: 'https://aliogberfin.dk'`, `lang="da"`.
2. Create `netlify.toml` (build command, publish dir, Node version, security headers).
   Connect the repo to Netlify and confirm the temporary `*.netlify.app` URL renders.

### Phase 2 — Design foundation (depends on 1)

3. Define design tokens in `src/styles/global.css` — restrained palette
   (off-white / warm sand / deep ink / one accent), a serif display font paired with a clean
   sans, fluid type scale, generous whitespace. Mobile-first breakpoints that only scale *up*.
4. Build the shell: `BaseLayout.astro`, sticky nav collapsing to a hamburger sheet on mobile,
   smooth anchor scrolling, and a minimal footer.
5. Build the hero: "Ali & Berfin", "12. december 2026 · kl. 16:00",
   "Nisa Event Center, Ishøj", and a `Countdown.astro` island counting down to
   `2026-12-12T16:00:00+01:00` with Danish labels (dage / timer / minutter / sekunder)
   and an "I dag er dagen!" end state.

### Phase 3 — Content sections (depends on 2; steps 6–8 parallel)

6. `Program` — vertical timeline anchored on the confirmed **16:00** start, with the later items
   (reception, middag, fest) as clearly-marked placeholders in a data file, editable in one line.
7. `Sted & transport` — venue card for Nisa Event Center, Industrivangen 26, 2635 Ishøj;
   embedded OpenStreetMap iframe with coordinates geocoded from the real address (verified
   visually, not guessed), plus buttons deep-linking to Google Maps and Apple Maps. No API key.
   A short note on S-tog to Ishøj Station and parking goes here once details are confirmed.
8. `FAQ` — native `<details>/<summary>` accordion, zero JavaScript, fully accessible.
   Starts with a few placeholder questions to edit.

### Phase 4 — Gallery & guestbook (depends on 2; step 9 parallel with 10–11)

9. `Galleri` — Astro's `<Image>` for automatic responsive/WebP output, fed by placeholders in
   `src/assets/gallery/` with Danish alt text, plus a lightweight tap-to-enlarge lightbox.
   Real photos later are a drop-in swap.
10. Create the Google Sheet with a `Gaestebog` tab and attach an Apps Script Web App exposing
    `doPost` (append) and `doGet` (return approved entries), guarded by a shared secret and
    deployed as "Anyone".
11. Build `netlify/functions/guestbook.ts` — validates name + message, checks a honeypot field,
    applies a per-IP rate limit, then forwards to Apps Script using `APPS_SCRIPT_URL` and
    `APPS_SCRIPT_SECRET` from Netlify env vars. Secrets never reach the browser. The section
    renders approved entries fetched on page load; moderation is a checkbox in the sheet.

### Phase 5 — Domain, privacy & polish (depends on all)

12. Register `aliogberfin.dk` via a DK Hostmaster-accredited registrar (Simply.com, one.com,
    UnoEuro), point DNS at Netlify, enable the free Let's Encrypt certificate and HTTPS redirect.
13. Privacy: `robots.txt` with `Disallow: /`, `<meta name="robots" content="noindex, nofollow">`,
    no sitemap — the link works for anyone it is sent to but won't surface in Google.
14. Polish: Open Graph / social preview card so the link looks good in WhatsApp and iMessage,
    favicon, `prefers-reduced-motion` support, keyboard navigation, colour-contrast check,
    Lighthouse tuning.

## Relevant files

All to be created:

- `astro.config.mjs` — static output, site URL, Tailwind integration
- `netlify.toml` — build settings, functions directory, security headers
- `src/layouts/BaseLayout.astro` — `lang="da"`, meta/OG tags, noindex
- `src/pages/index.astro` — composes the sections in order
- `src/components/` — `Nav.astro`, `Hero.astro`, `Countdown.astro`, `Program.astro`,
  `Venue.astro`, `Gallery.astro`, `Faq.astro`, `Guestbook.astro`, `Footer.astro`
- `src/content/wedding.ts` — **single source of truth** for all Danish copy, the date/time,
  venue address, map coordinates and links. Edit here, never in components.
- `src/styles/global.css` — Tailwind v4 `@theme` tokens, fonts, base styles
- `netlify/functions/guestbook.ts` — validation + forwarding
- `google-apps-script/Code.gs` — kept in-repo for reference, pasted into the Apps Script editor
- `public/robots.txt`, `public/favicon.svg`, `src/assets/` — placeholders
- `.env.example` — documents `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`

## Verification

1. `npm run dev` → renders with no console errors; check at 375px, 768px and 1440px.
2. `npx astro check` and `npm run build` pass clean.
3. Netlify deploy preview succeeds; open the live URL on a real phone.
4. Countdown: temporarily set a near-term target to confirm it ticks, then verify the correct
   day count to 12.12.2026 16:00 CET from a non-Danish timezone.
5. Map: the OSM embed visibly centres on Industrivangen 26 in Ishøj; both map deep links open
   the correct destination on iOS and Android.
6. Guestbook: post a message → row appears in the Sheet; it does *not* render on the site until
   `approved` is ticked. Honeypot-filled submission is silently rejected. Empty name shows an
   inline Danish error.
7. `curl -I https://aliogberfin.dk` returns 200 over HTTPS; `/robots.txt` shows `Disallow: /`;
   view-source confirms the noindex tag.
8. Lighthouse mobile: Performance ≥ 95, Accessibility 100. Paste the URL into WhatsApp to
   confirm the preview card.

## Decisions

- **Danish only** — no i18n framework.
- **One long scrolling page** with anchor navigation — best on mobile, and five sections keeps
  it short.
- **No attendance confirmation of any kind** — the site is purely an invitation, so no RSVP form
  and no "contact us to confirm" CTA.
- **Guestbook kept** — the only backend, worth the small amount of setup.
- **Excluded**: RSVP, dresscode, gift/wishlist, accommodation & travel info, "our story",
  per-guest links, multi-language.
- **Apps Script over Netlify Forms** — live Google Sheet, no submission cap
  (Netlify's free tier caps at 100 submissions/month and only exports CSV).
- **OpenStreetMap over Google Maps embed** — no API key, no billing account,
  no third-party cookies.
- **Unknowns handled as marked placeholders**: the program beyond 16:00, the FAQ questions,
  and the photos. Layout gets finished now; blanks are filled later with single-line edits
  to `wedding.ts`.
- Deployment happens in Phase 1, not at the end.

## Further considerations

1. **Register the domain early.** The `.dk` registration is a manual step, and DK Hostmaster
   registrations can take a day or two to propagate. The site runs fine on the Netlify URL
   meanwhile.
2. **Ceremony vs. reception at 16:00** — the 16:00 entry is labelled "Ankomst & vielse" by
   default; easy to change in the program data file.
