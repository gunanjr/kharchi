import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { GlyphName } from './glyphs';

/** App-level icon names. Every one resolves to an Ionicons glyph, so there is a single icon language. */
const map = {
  home: 'home-outline',
  homeFill: 'home',
  list: 'receipt-outline',
  listFill: 'receipt',
  users: 'people-outline',
  usersFill: 'people',
  chart: 'stats-chart-outline',
  chartFill: 'stats-chart',
  menu: 'grid-outline',
  menuFill: 'grid',
  plus: 'add',
  check: 'checkmark',
  x: 'close',
  search: 'search-outline',
  chevron: 'chevron-forward',
  back: 'chevron-back',
  ribbon: 'ribbon-outline',
  palette: 'color-palette-outline',
  bulb: 'bulb-outline',
  play: 'play-circle-outline',
  flag: 'flag-outline',
  heart: 'heart-outline',
  eye: 'eye-outline',
  camera: 'camera-outline',
  image: 'image-outline',
  receipt: 'receipt-outline',
  eyeOff: 'eye-off-outline',
  trash: 'trash-outline',
  bolt: 'flash-outline',
  flame: 'flame',
  boltFill: 'flash',
  settings: 'settings-outline',
  options: 'options-outline',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  lock: 'lock-closed-outline',
  moon: 'moon-outline',
  language: 'language-outline',
  wallet: 'wallet-outline',
  target: 'flag-outline',
  tag: 'pricetag-outline',
  repeat: 'repeat-outline',
  download: 'download-outline',
  shield: 'shield-checkmark-outline',
  code: 'code-slash-outline',
  chat: 'chatbubble-ellipses-outline',
  send: 'arrow-up',
  mail: 'mail-outline',
  share: 'share-outline',
  edit: 'create-outline',
  calendar: 'calendar-outline',
  person: 'person-outline',
  personAdd: 'person-add-outline',
  alert: 'alert-circle-outline',
  info: 'information-circle-outline',
  link: 'link-outline',
  swap: 'swap-horizontal-outline',
  vibrate: 'phone-portrait-outline',
  bell: 'notifications-outline',
  scan: 'qr-code-outline',
  cash: 'cash-outline',
} as const satisfies Record<string, GlyphName>;

export type IconName = keyof typeof map;

export function Icon({ name, size = 22, color = '#000' }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return <Ionicons name={map[name]} size={size} color={color} />;
}

/** Any Ionicons glyph by its own name (used for category, account and group glyphs). */
export function Glyph({ name, size = 22, color = '#000' }: { name: GlyphName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
