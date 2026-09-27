/**
 * Eneste kilde til sandhed for alt indhold på siden.
 * Ret tekster, tider og links her — ikke inde i komponenterne.
 */

export const site = {
  url: 'https://aliogberfin.dk',
  title: 'Ali & Berfin — 12. december 2026',
  description:
    'Vi skal giftes! Ali Haider Mohammad og Berfin Flora Turan inviterer til bryllup lørdag den 12. december 2026 i Nisa Event Center, Ishøj.',
  locale: 'da_DK',
} as const;

export const couple = {
  one: 'Ali',
  two: 'Berfin',
  oneFull: 'Ali Haider Mohammad',
  twoFull: 'Berfin Flora Turan',
} as const;

/** Vielsestidspunkt i Europe/Copenhagen. December = CET = UTC+1. */
export const weddingDate = {
  iso: '2026-12-12T16:00:00+01:00',
  dateLong: '12. december 2026',
  dateShort: '12.12.2026',
  weekday: 'Lørdag',
  time: '16:00',
} as const;

export const venue = {
  name: 'Nisa Event Center',
  street: 'Industrivangen 26',
  postalCode: '2635',
  city: 'Ishøj',
  country: 'Danmark',
  /** Geokodet via OpenStreetMap Nominatim. */
  lat: 55.605978,
  lng: 12.351007,
} as const;

export const venueQuery = encodeURIComponent(
  `${venue.name}, ${venue.street}, ${venue.postalCode} ${venue.city}, ${venue.country}`,
);

export const maps = {
  google: `https://www.google.com/maps/search/?api=1&query=${venueQuery}`,
  apple: `https://maps.apple.com/?q=${venueQuery}&ll=${venue.lat},${venue.lng}`,
  /** Lille bbox omkring adressen, så indlejringen zoomer helt ind. */
  osmEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${
    venue.lng - 0.006
  }%2C${venue.lat - 0.003}%2C${venue.lng + 0.006}%2C${
    venue.lat + 0.003
  }&layer=mapnik&marker=${venue.lat}%2C${venue.lng}`,
  osmLink: `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}`,
} as const;

export const nav = [
  { href: '#program', label: 'Program' },
  { href: '#sted', label: 'Sted' },
  { href: '#galleri', label: 'Galleri' },
  { href: '#faq', label: 'Spørgsmål' },
  { href: '#gaestebog', label: 'Gæstebog' },
] as const;

export type ProgramItem = {
  time: string;
  title: string;
  description: string;
  /** Sæt til true når tidspunktet er endeligt bekræftet. */
  confirmed: boolean;
};

export const program: ProgramItem[] = [
  {
    time: '16:00',
    title: 'Ankomst & vielse',
    description:
      'Dørene åbner, og vi beder jer være på plads i god tid, så vi kan begynde til tiden.',
    confirmed: true,
  },
  {
    time: '17:00',
    title: 'Reception',
    description: 'Velkomstdrinks, lykønskninger og de første billeder.',
    confirmed: false,
  },
  {
    time: '18:30',
    title: 'Middag',
    description: 'Vi sætter os til bords og spiser sammen.',
    confirmed: false,
  },
  {
    time: '21:00',
    title: 'Fest & dans',
    description: 'Kagen skæres, musikken skrues op, og festen fortsætter.',
    confirmed: false,
  },
];

export const transport = [
  {
    title: 'Med tog',
    body: 'Tag S-toget linje A eller E til Ishøj Station. Derfra er der cirka 15 minutters gang eller en kort tur med bus eller taxa.',
  },
  {
    title: 'I bil',
    body: 'Sæt Industrivangen 26, 2635 Ishøj i GPS\u2019en. Der er gratis parkering ved adressen.',
  },
] as const;

export type FaqItem = { question: string; answer: string };

export const faq: FaqItem[] = [
  {
    question: 'Hvornår skal jeg være der?',
    answer:
      'Vi begynder klokken 16:00. Kom gerne 15\u201320 minutter før, så alle er på plads, når vi starter.',
  },
  {
    question: 'Er der parkering ved lokationen?',
    answer:
      'Ja, der er gratis parkering ved Industrivangen 26. Kør gerne sammen hvis I kan.',
  },
  {
    question: 'Må jeg tage billeder?',
    answer:
      'Meget gerne — men lad venligst telefonen blive i lommen under selve vielsen, så vores fotograf kan få de bedste billeder.',
  },
  {
    question: 'Hvem kan jeg kontakte, hvis jeg er i tvivl om noget?',
    answer: 'Skriv til os direkte, så vender vi tilbage hurtigst muligt.',
  },
];

export const guestbook = {
  heading: 'Gæstebog',
  intro:
    'Efterlad en hilsen til os. Vi læser hver eneste besked og glæder os til at se dem alle sammen.',
  nameLabel: 'Dit navn',
  messageLabel: 'Din hilsen',
  submitLabel: 'Send hilsen',
  sendingLabel: 'Sender …',
  successMessage:
    'Tusind tak for din hilsen! Den vises på siden, så snart vi har set den.',
  errorMessage:
    'Noget gik galt, og din hilsen blev ikke sendt. Prøv venligst igen om lidt.',
  emptyState: 'Der er ingen hilsner endnu. Bliv den første til at skrive.',
  loadingState: 'Henter hilsner …',
  maxNameLength: 80,
  maxMessageLength: 800,
} as const;
