/**
 * Siden bygges på dansk. Hver oversættelig tekst får både den danske og den
 * engelske version med i data-attributter, så sprogknappen i navigationen kan
 * skifte tekst i browseren uden at hente en ny side.
 */

export type Lang = 'da' | 'en';

export type Text = Record<Lang, string>;

export const languages: Lang[] = ['da', 'en'];

/** Bygger en tekst ud fra én skabelon, fx når datoen indgår i sætningen. */
export const compose = (build: (lang: Lang) => string): Text => ({
  da: build('da'),
  en: build('en'),
});

/** Spred på et element hvis tekstindhold skal oversættes: `<p {...t(x)}>{x.da}</p>`. */
export const t = (text: Text) => ({
  'data-i18n': '',
  'data-da': text.da,
  'data-en': text.en,
});

/** Spred på et element hvis attribut (fx alt, title, aria-label) skal oversættes. */
export const tAttr = (attr: string, text: Text) => ({
  'data-i18n': '',
  [attr]: text.da,
  [`data-da-${attr}`]: text.da,
  [`data-en-${attr}`]: text.en,
});

/** Det sprog siden vises på lige nu (bruges af klientscripts). */
export const currentLang = (): Lang =>
  document.documentElement.lang === 'en' ? 'en' : 'da';

/** Sendes på document, når sproget skiftes. */
export const LANG_EVENT = 'langchange';
