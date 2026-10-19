/**
 * Design tokens. Mirrors KHARCHI.md section 4 ("Ink & Marigold"). Nothing outside the theme folder
 * should contain a raw colour, font name, radius or shadow: read them through useTheme() and these exports.
 */
export const palette = {
  light: {
    bg: '#F3F1EC', // warm stone page, flat
    surface: '#FFFFFF', // cards, sheets
    surfaceAlt: '#F6F4EF', // recessed wells inside a card, input fills
    border: 'rgba(32,26,18,0.09)', // hairline
    text: '#16130E',
    textMuted: '#645D52', // 6.4:1 on white
    textSubtle: '#938B7E', // timestamps, helper copy (not for essential text)
    primary: '#F0A31B', // marigold: fills only (bars, FAB, dots, selected indicators)
    onPrimary: '#1D1405',
    primarySoft: 'rgba(240,163,27,0.16)',
    link: '#9A5A00', // deep amber for text links on white (5.3:1)
    ink: '#1C1A22', // deep ink: hero cards, primary buttons, selected chips, tooltips
    onInk: '#FFFFFF',
    onInkMuted: 'rgba(255,255,255,0.64)',
    onInkLine: 'rgba(255,255,255,0.14)',
    incomeOnInk: '#5FD0A0', // green and red tuned for the ink hero card
    expenseOnInk: '#F2877D',
    hero: '#1C1A22', // the big feature cards (Home hero, review, goals): deep in both themes
    onHero: '#FFFFFF',
    onHeroMuted: 'rgba(255,255,255,0.66)',
    onHeroLine: 'rgba(255,255,255,0.12)',
    incomeOnHero: '#5FD0A0',
    expenseOnHero: '#F2877D',
    accent: '#46407A', // quiet indigo for secondary series and highlights
    income: '#1B7F57',
    incomeSoft: 'rgba(27,127,87,0.12)',
    expense: '#B8402F', // only for owing / over-budget / negative balances, never for every expense row
    expenseSoft: 'rgba(184,64,47,0.10)',
    warn: '#946200',
    warnSoft: 'rgba(240,163,27,0.18)',
    danger: '#B3261E',
    overlay: 'rgba(22,19,14,0.42)',
    skeleton: '#E9E5DC',
    track: 'rgba(32,26,18,0.07)',
    shadow: '#2A2118',
  },
  dark: {
    bg: '#0F0E12',
    surface: '#1A1920',
    surfaceAlt: '#23222B',
    border: 'rgba(255,255,255,0.09)',
    text: '#F4F2EE',
    textMuted: '#A8A298',
    textSubtle: '#7D776D',
    primary: '#F5B33A',
    onPrimary: '#1D1405',
    primarySoft: 'rgba(245,179,58,0.16)',
    link: '#F5B33A',
    ink: '#F4F2EE', // inverted: light hero cards on a dark page
    onInk: '#16130E',
    onInkMuted: 'rgba(22,19,14,0.62)',
    onInkLine: 'rgba(22,19,14,0.14)',
    incomeOnInk: '#1B7F57',
    expenseOnInk: '#B8402F',
    hero: '#262431', // lifted charcoal so the card reads as a card on the near-black page, never a bright block
    onHero: '#F4F2EE',
    onHeroMuted: 'rgba(244,242,238,0.64)',
    onHeroLine: 'rgba(244,242,238,0.10)',
    incomeOnHero: '#5FD0A0',
    expenseOnHero: '#F2877D',
    accent: '#9C96E0',
    income: '#5FD0A0',
    incomeSoft: 'rgba(95,208,160,0.14)',
    expense: '#EE8A78',
    expenseSoft: 'rgba(238,138,120,0.14)',
    warn: '#E8B84A',
    warnSoft: 'rgba(232,184,74,0.16)',
    danger: '#F2877D',
    overlay: 'rgba(0,0,0,0.62)',
    skeleton: '#26252E',
    track: 'rgba(255,255,255,0.08)',
    shadow: '#000000',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

/**
 * Category palette: a warm-to-cool ramp (marigold, ember, raspberry, plum, indigo, teal, sage) that stays
 * cohesive on the stone page and reads clearly in the donut and bar charts.
 */
export const chartColors = ['#F0A31B', '#E1702B', '#C44A3A', '#9A3556', '#6B3C79', '#4A4A92', '#3E7A93', '#4C9A7C', '#8BA85A', '#B5A07C'];

/** Old stored category colours (from before the redesign) mapped onto the new ramp, so existing data matches. */
const LEGACY_TONE: Record<string, string> = {
  '#C2501A': '#E1702B', '#7A8B2E': '#8BA85A', '#3F7CAC': '#3E7A93', '#B83A5B': '#9A3556', '#D19A1E': '#F0A31B',
  '#8C5A3C': '#B5A07C', '#6C5B9E': '#6B3C79', '#2F9E8F': '#4C9A7C', '#0E7C70': '#3E7A93', '#A0527C': '#C44A3A',
  '#5B6FB0': '#4A4A92', '#8A7F6E': '#938B7E', '#0E6B4F': '#1B7F57',
};
export const toneOf = (c?: string | null) => (c ? LEGACY_TONE[c.toUpperCase()] ?? c : '#938B7E');

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const layout = { gutter: 20, cardPad: 20, gap: 16, maxWidth: 640, tabBar: 64 } as const;
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const hit = 48; // minimum touch target (dp)

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  // legacy keys, kept so older call sites keep resolving
  display: 'Geist_600SemiBold',
  displayBold: 'Geist_700Bold',
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodyBold: 'Geist_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  hero: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 50, letterSpacing: -1.6 },
  h1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  h2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  caps: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1 },
  money: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  moneyLg: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.9 },
} as const;

export const shadow = {
  card: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16 },
  floating: { shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 26 },
} as const;

/** Motion: strong ease-out for anything entering or responding, never ease-in on UI. */
export const motion = { press: 90, release: 150, fast: 160, base: 260, slow: 420, stagger: 45, scale: 0.97, ease: [0.23, 1, 0.32, 1] as const };

/** Accent colours (Plus). `fill` paints surfaces, `link` is the text colour on white and on the dark page. */
export const ACCENTS = {
  marigold: { label: 'Marigold', light: { fill: '#F0A31B', link: '#9A5A00' }, dark: { fill: '#F5B33A', link: '#F5B33A' } },
  teal: { label: 'Teal', light: { fill: '#2FBFA5', link: '#0B7A66' }, dark: { fill: '#46D4BA', link: '#46D4BA' } },
  rose: { label: 'Rose', light: { fill: '#F0708F', link: '#B3224F' }, dark: { fill: '#F58CA6', link: '#F58CA6' } },
  indigo: { label: 'Indigo', light: { fill: '#8F8DF2', link: '#4A46B8' }, dark: { fill: '#A5A3F7', link: '#A5A3F7' } },
} as const;
export type AccentKey = keyof typeof ACCENTS;
