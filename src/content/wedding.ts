/**
 * Eneste kilde til sandhed for alt indhold på siden.
 * Ret tekster, tider og links her - ikke inde i komponenterne.
 * Tekster skrives på både dansk (da) og engelsk (en).
 */

import { compose, type Text } from '../i18n';

export const site = {
  url: 'https://aliogberfin.dk',
  title: {
    da: 'Ali & Berfin - 12. december 2026',
    en: 'Ali & Berfin - 12 December 2026',
  } satisfies Text,
  description: {
    da: 'Vi skal giftes! Ali Haider Mohammad og Berfin Flora Turan inviterer til bryllup lørdag den 12. december 2026 i Nisa Event Center, Ishøj.',
    en: 'We are getting married! Ali Haider Mohammad and Berfin Flora Turan invite you to their wedding on Saturday 12 December 2026 at Nisa Event Center, Ishøj.',
  } satisfies Text,
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
  dateLong: { da: '12. december 2026', en: '12 December 2026' } satisfies Text,
  dateShort: '12.12.2026',
  weekday: { da: 'Lørdag', en: 'Saturday' } satisfies Text,
  time: '16:00',
} as const;

export const venue = {
  name: 'Nisa Event Center',
  street: 'Vejleåvej 56',
  postalCode: '2635',
  city: 'Ishøj',
  country: 'Danmark',
  /** Geokodet via OpenStreetMap Nominatim: "56, Vejleåvej, Ishøj, 2635". */
  lat: 55.616892,
  lng: 12.314681,
} as const;

export const venueQuery = encodeURIComponent(
  `${venue.name}, ${venue.street}, ${venue.postalCode} ${venue.city}, ${venue.country}`,
);

/**
 * Google slår navnet "Nisa Event Center" op som en virksomhed med en forkert
 * adresse, så Google Maps får kun selve adressen.
 */
export const addressQuery = encodeURIComponent(
  `${venue.street}, ${venue.postalCode} ${venue.city}, ${venue.country}`,
);

export const maps = {
  google: `https://www.google.com/maps/search/?api=1&query=${addressQuery}`,
  apple: `https://maps.apple.com/?q=${venueQuery}&ll=${venue.lat},${venue.lng}`,
  /** Lille bbox omkring adressen, så indlejringen zoomer helt ind. */
  osmEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${
    venue.lng - 0.006
  }%2C${venue.lat - 0.003}%2C${venue.lng + 0.006}%2C${
    venue.lat + 0.003
  }&layer=mapnik&marker=${venue.lat}%2C${venue.lng}`,
  osmLink: `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}`,
} as const;

export const nav: { href: string; label: Text }[] = [
  { href: '#program', label: { da: 'Program', en: 'Programme' } },
  { href: '#billeder', label: { da: 'Del billeder', en: 'Share photos' } },
  { href: '#gaestebog', label: { da: 'Gæstebog', en: 'Guestbook' } },
  { href: '#sted', label: { da: 'Sted', en: 'Venue' } },
];

export type ProgramItem = {
  /** Udelad for punkter uden fast tidspunkt. */
  time?: string;
  title: Text;
  description: Text;
  /** Sæt til true når tidspunktet er endeligt bekræftet. */
  confirmed: boolean;
};

export const program: ProgramItem[] = [
  {
    time: '16:00',
    title: { da: 'Velkomst', en: 'Welcome' },
    description: {
      da: 'Gæsterne ankommer. Der er musik og dans.',
      en: 'Guests arrive. There will be music and dancing.',
    },
    confirmed: true,
  },
  {
    time: '17:00',
    title: { da: 'Brudeparrets entré', en: 'The couple\u2019s entrance' },
    description: {
      da: 'Vi ankommer og glæder os til at fejre med jer.',
      en: 'We arrive and look forward to celebrating with you.',
    },
    confirmed: true,
  },
  {
    time: '18:30',
    title: { da: 'Middag', en: 'Dinner' },
    description: {
      da: 'Der serveres aftensmad.',
      en: 'Dinner is served.',
    },
    confirmed: true,
  },
  {
    time: '20:00',
    title: { da: 'Bryllupskage', en: 'Wedding cake' },
    description: {
      da: 'Vi skærer kagen, efterfulgt af mere musik og dans.',
      en: 'We cut the cake, followed by more music and dancing.',
    },
    confirmed: true,
  },
  {
    title: { da: 'Fest', en: 'Party' },
    description: {
      da: 'Festen fortsætter resten af aftenen.',
      en: 'The party continues for the rest of the evening.',
    },
    confirmed: true,
  },
];

export const photoShare = {
  eyebrow: { da: 'Øjeblikke', en: 'Moments' } satisfies Text,
  heading: { da: 'Del billeder', en: 'Share photos' } satisfies Text,
  intro: {
    da: 'Tag billeder i løbet af dagen, og del dem med os. Scan QR-koden med kameraet på din telefon, eller brug linket herunder.',
    en: 'Take photos throughout the day and share them with us. Scan the QR code with your phone camera, or use the link below.',
  } satisfies Text,
  url: 'https://join.once.film/f/Mu4oCyqC',
  qrLabel: {
    da: 'QR-kode, der åbner siden hvor du kan dele billeder',
    en: 'QR code that opens the page where you can share photos',
  } satisfies Text,
  linkLabel: {
    da: 'Del dine billeder',
    en: 'Share your photos',
  } satisfies Text,
  photoAlt: {
    da: 'Ali og Berfin smiler med vielsesattesten efter vielsen',
    en: 'Ali and Berfin smiling with their marriage certificate after the ceremony',
  } satisfies Text,
} as const;

export const guestbook = {
  heading: { da: 'Gæstebog', en: 'Guestbook' } satisfies Text,
  intro: {
    da: 'Efterlad en hilsen til os. Vi læser hver eneste besked og glæder os til at se dem alle sammen.',
    en: 'Leave us a message. We read every single one and look forward to seeing them all.',
  } satisfies Text,
  nameLabel: { da: 'Dit navn', en: 'Your name' } satisfies Text,
  messageLabel: { da: 'Din hilsen', en: 'Your message' } satisfies Text,
  nameRequired: {
    da: 'Skriv venligst dit navn.',
    en: 'Please enter your name.',
  } satisfies Text,
  messageRequired: {
    da: 'Skriv venligst en hilsen.',
    en: 'Please write a message.',
  } satisfies Text,
  submitLabel: { da: 'Send hilsen', en: 'Send message' } satisfies Text,
  sendingLabel: { da: 'Sender \u2026', en: 'Sending \u2026' } satisfies Text,
  successMessage: {
    da: 'Tusind tak for din hilsen! Den vises på siden, så snart vi har set den.',
    en: 'Thank you so much for your message! It will appear on the page as soon as we have seen it.',
  } satisfies Text,
  errorMessage: {
    da: 'Noget gik galt, og din hilsen blev ikke sendt. Prøv venligst igen om lidt.',
    en: 'Something went wrong and your message was not sent. Please try again in a moment.',
  } satisfies Text,
  emptyState: {
    da: 'Der er ingen hilsner endnu. Bliv den første til at skrive.',
    en: 'There are no messages yet. Be the first to write one.',
  } satisfies Text,
  loadingState: {
    da: 'Henter hilsner \u2026',
    en: 'Loading messages \u2026',
  } satisfies Text,
  /** Sprog til datoen under hver hilsen. */
  dateLocale: { da: 'da-DK', en: 'en-GB' } satisfies Text,
  photoAlt: {
    da: 'Ali og Berfin smiler, mens de skriver under ved vielsen',
    en: 'Ali and Berfin smiling as they sign at their civil ceremony',
  } satisfies Text,
  maxNameLength: 80,
  maxMessageLength: 800,
} as const;

/** Datoen som den står øverst i hero og program, fx "Lørdag 12. december 2026". */
export const weddingDay = compose(
  (lang) => `${weddingDate.weekday[lang]} ${weddingDate.dateLong[lang]}`,
);
