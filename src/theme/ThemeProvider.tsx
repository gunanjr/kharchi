import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';
import { ACCENTS, palette, shadow, type Colors } from './tokens';
import { useSettings } from '@/store/settings';

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
  const plus = useSettings((s) => s.plusPreview);
  const accent = useSettings((s) => s.accent);
  const value = useMemo(() => {
    const base = dark ? palette.dark : palette.light;
    // Accent colours are a Plus feature: without Plus the app always uses marigold.
    const a = ACCENTS[plus ? accent : 'marigold'][dark ? 'dark' : 'light'];
    const rgb = a.fill.slice(1).match(/../g)!.map((h) => parseInt(h, 16)).join(',');
    const colors: Colors = { ...base, primary: a.fill, link: a.link, primarySoft: `rgba(${rgb},0.16)` };
    return { colors, dark, shadows: makeShadows(colors, dark) };
  }, [dark, plus, accent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
