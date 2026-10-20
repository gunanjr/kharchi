import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';
import { ACCENTS, palette, shadow, type Colors } from './tokens';
import { useSettings } from '@/store/settings';
import { seasonTheme } from '@/features/pro/hub/theme';

type Shadows = { card: ViewStyle; floating: ViewStyle };
type Theme = { colors: Colors; dark: boolean; shadows: Shadows };

/** Shadows only exist on the light scheme (on dark the hairline carries the edge). */
function makeShadows(colors: Colors, dark: boolean): Shadows {
  if (dark) return { card: {}, floating: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24 } };
  return {
    card: { ...shadow.card, shadowColor: colors.shadow },
    floating: { ...shadow.floating, shadowColor: colors.shadow },
  };
}

const Ctx = createContext<Theme>({ colors: palette.light, dark: false, shadows: makeShadows(palette.light, false) });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const accent = useSettings((s) => s.accent);
  const value = useMemo(() => {
    const base = dark ? palette.dark : palette.light;
    const a = ACCENTS[accent][dark ? 'dark' : 'light'];
    const rgb = a.fill.slice(1).match(/../g)!.map((h) => parseInt(h, 16)).join(',');
    const colors: Colors = { ...base, primary: a.fill, link: a.link, primarySoft: `rgba(${rgb},0.16)` };
    return { colors, dark, shadows: makeShadows(colors, dark) };
  }, [dark, accent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/**
 * Pro screens: the same components, re-coloured with the Pro tab's season palette (dark, flat), so every screen opened
 * from Pro looks like it belongs to Pro. Wraps the (pro) route group.
 */
export function ProThemeProvider({ children }: { children: React.ReactNode }) {
  const pick = useSettings((s) => s.proPalette);
  const value = useMemo(() => {
    const t = seasonTheme(Date.now(), pick);
    const rgb = t.accent.slice(1).match(/../g)!.map((h) => parseInt(h, 16)).join(',');
    const colors: Colors = {
      ...palette.dark,
      bg: t.base, surface: t.tile, surfaceAlt: t.tile2, border: t.line, skeleton: t.tile2, track: t.line,
      text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.66)', textSubtle: 'rgba(255,255,255,0.45)',
      primary: t.accent, onPrimary: '#14181F', primarySoft: `rgba(${rgb},0.16)`, link: t.accent,
      ink: '#FFFFFF', onInk: '#14181F', onInkMuted: 'rgba(20,24,31,0.62)', onInkLine: 'rgba(20,24,31,0.14)',
      hero: t.tile2, onHero: '#FFFFFF', onHeroMuted: 'rgba(255,255,255,0.64)', onHeroLine: t.line,
    };
    return { colors, dark: true, shadows: makeShadows(colors, true) };
  }, [pick]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The current Pro palette (season or the user's pick), for Pro screens that draw their own surfaces. */
export function useSeason() {
  const pick = useSettings((s) => s.proPalette);
  return seasonTheme(Date.now(), pick);
}
