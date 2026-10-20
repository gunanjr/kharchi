/**
 * Design tokens. Mirrors BRUHME.md section 4 (brand navy and orange). Nothing outside the theme folder
 * should contain a raw colour, font name, radius or shadow: read them through useTheme() and these exports.
 */
export const palette = {
  light: {
    bg: '#FFFFFF', // warm white page, flat
    surface: '#FFFFFF', // cards, sheets
    surfaceAlt: '#F4F2EF', // recessed wells inside a card, input fills
    border: 'rgba(33,41,52,0.09)', // hairline
    text: '#212934', // brand navy
    textMuted: '#5B6573', // 6:1 on white
    textSubtle: '#8A93A0', // timestamps, helper copy (not for essential text)
    primary: '#FF8106', // brand orange: fills only (add button, bars, dots, selected indicators)
    onPrimary: '#212934',
    primarySoft: 'rgba(255,129,6,0.16)',
    link: '#C24700', // deep orange for text links on white (5.2:1)
    ink: '#212934', // brand navy: hero cards, primary buttons, selected chips, tooltips
    onInk: '#FFFFFF',
    onInkMuted: 'rgba(255,255,255,0.64)',
    onInkLine: 'rgba(255,255,255,0.14)',
    incomeOnInk: '#5FD0A0', // green and red tuned for the ink hero card
    expenseOnInk: '#F2877D',
    hero: '#212934', // the big feature cards (Home hero, review, goals): deep in both themes
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
    warn: '#A85A00',
    warnSoft: 'rgba(255,129,6,0.18)',
    danger: '#B3261E',
    overlay: 'rgba(20,25,33,0.45)',
    skeleton: '#E8E5E0',
    track: 'rgba(33,41,52,0.07)',
    shadow: '#1B2230',
  },
  dark: {
    bg: '#0F1319',
    surface: '#181D25',
    surfaceAlt: '#212731',
    border: 'rgba(255,255,255,0.09)',
    text: '#F4F5F7',
    textMuted: '#A3ABB8',
    textSubtle: '#778090',
    primary: '#FF9433',
    onPrimary: '#212934',
    primarySoft: 'rgba(255,148,51,0.16)',
    link: '#FF9433',
    ink: '#F4F5F7', // inverted: light buttons and chips on a dark page
    onInk: '#212934',
    onInkMuted: 'rgba(33,41,52,0.62)',
    onInkLine: 'rgba(33,41,52,0.14)',
    incomeOnInk: '#1B7F57',
    expenseOnInk: '#B8402F',
    hero: '#222A36', // lifted charcoal so the card reads as a card on the near-black page, never a bright block
    onHero: '#F4F5F7',
    onHeroMuted: 'rgba(244,245,247,0.64)',
    onHeroLine: 'rgba(244,245,247,0.10)',
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
    skeleton: '#222833',
    track: 'rgba(255,255,255,0.08)',
    shadow: '#000000',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

/**
 * Category palette: a warm-to-cool ramp (brand orange, coral, raspberry, plum, indigo, teal, sage) that stays
 * cohesive on the warm white page and reads clearly in the donut and bar charts.
 */
export const chartColors = ['#FF8106', '#E5484D', '#C23A6B', '#7B4A9E', '#4A55B5', '#2F7FA8', '#2E9C8A', '#6BAA4F', '#B8A04A', '#8C8478'];

/** Old stored category colours (from before the redesign) mapped onto the new ramp, so existing data matches. */
const LEGACY_TONE: Record<string, string> = {
  // colours stored before the redesigns, mapped onto the current ramp so existing categories match
  '#C2501A': '#FF8106', '#E1702B': '#FF8106', '#F0A31B': '#FF8106', '#D19A1E': '#FF8106',
  '#C44A3A': '#E5484D', '#B83A5B': '#C23A6B', '#9A3556': '#C23A6B', '#A0527C': '#C23A6B',
  '#6C5B9E': '#7B4A9E', '#6B3C79': '#7B4A9E', '#5B6FB0': '#4A55B5', '#4A4A92': '#4A55B5',
  '#3F7CAC': '#2F7FA8', '#3E7A93': '#2F7FA8', '#0E7C70': '#2F7FA8', '#2F9E8F': '#2E9C8A', '#4C9A7C': '#2E9C8A',
  '#7A8B2E': '#6BAA4F', '#8BA85A': '#6BAA4F', '#8C5A3C': '#B8A04A', '#B5A07C': '#B8A04A', '#8A7F6E': '#8A93A0', '#0E6B4F': '#1B7F57',
};
export const toneOf = (c?: string | null) => (c ? LEGACY_TONE[c.toUpperCase()] ?? c : '#8A93A0');

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const layout = { gutter: 20, cardPad: 20, gap: 16, maxWidth: 640, tabBar: 64 } as const;
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const hit = 48; // minimum touch target (dp)

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  brand: 'Nunito_800ExtraBold', // headings: matches the rounded wordmark
  brandBlack: 'Nunito_900Black',
  // legacy keys, kept so older call sites keep resolving
  display: 'Geist_600SemiBold',
  displayBold: 'Geist_700Bold',
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodyBold: 'Geist_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.brandBlack, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  hero: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 50, letterSpacing: -1.6 },
  h1: { fontFamily: fonts.brand, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  h2: { fontFamily: fonts.brand, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  h3: { fontFamily: fonts.brand, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
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
  marigold: { label: 'Orange', light: { fill: '#FF8106', link: '#C24700' }, dark: { fill: '#FF9433', link: '#FF9433' } },
  teal: { label: 'Teal', light: { fill: '#2FBFA5', link: '#0B7A66' }, dark: { fill: '#46D4BA', link: '#46D4BA' } },
  rose: { label: 'Rose', light: { fill: '#F0708F', link: '#B3224F' }, dark: { fill: '#F58CA6', link: '#F58CA6' } },
  indigo: { label: 'Indigo', light: { fill: '#8F8DF2', link: '#4A46B8' }, dark: { fill: '#A5A3F7', link: '#A5A3F7' } },
} as const;
export type AccentKey = keyof typeof ACCENTS;
