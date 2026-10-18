import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const paths = {
  home: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  list: 'M4 6h16M4 12h16M4 18h10',
  users: 'M16 11a3 3 0 100-6 3 3 0 000 6zM8 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 5-4s3 1.5 3 4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  menu: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.5-4.5',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
} as const;
export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color = '#000', stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <Path d={paths[name]} />
      {name === 'menu' ? <Circle cx="12" cy="12" r="0.5" /> : null}
    </Svg>
  );
}
