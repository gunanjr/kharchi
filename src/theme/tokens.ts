/** Design tokens. Mirrors .interface-design/system.md. "Saffron & Ink": warm paper, ink text, terracotta + deep teal. */
export const palette = {
  light: {
    bg: '#F6EEDF',
    surface: '#FFFAF0',
    surfaceAlt: '#EFE4CF',
    border: '#E2D3B8',
    text: '#1E1812',
    textMuted: '#6B5F4F', // AA on bg (5.6:1)
    primary: '#B8400E', // terracotta, AA with white text (5.3:1)
    onPrimary: '#FFFFFF',
    primarySoft: '#F6D9C6',
    accent: '#0E5A52', // deep teal
    income: '#0E6B4F',
    expense: '#A8321E',
    warn: '#946200',
    danger: '#B3261E',
    overlay: 'rgba(30,24,18,0.45)',
    skeleton: '#E9DCC4',
  },
  dark: {
    bg: '#14100B',
    surface: '#1E1913',
    surfaceAlt: '#2A231A',
    border: '#3A3126',
    text: '#F5ECDC',
    textMuted: '#B3A691',
    primary: '#F29A52', // amber
    onPrimary: '#1E1208',
    primarySoft: '#3B2616',
    accent: '#5CC4B4',
    income: '#6FD3A5',
    expense: '#F0836F',
    warn: '#E8B84A',
    danger: '#F2877D',
    overlay: 'rgba(0,0,0,0.6)',
    skeleton: '#2A231A',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

/** Category palette: distinct, colour-blind-considerate hues that work on both themes. */
export const chartColors = ['#C2501A', '#0E7C70', '#D19A1E', '#6C5B9E', '#B83A5B', '#3F7CAC', '#7A8B2E', '#8C5A3C', '#2F9E8F', '#A0527C'];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const hit = 48; // min touch target (dp)

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 44, lineHeight: 50 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  caps: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 1 },
  money: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26 },
} as const;

export const motion = { fast: 160, base: 260, slow: 420, stagger: 45 } as const;
