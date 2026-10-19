/**
 * One icon language: line icons (Ionicons outline) everywhere. Categories, accounts and groups keep their stored
 * emoji in the database (so nothing is migrated); these tables decide which line icon draws them.
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { Category } from '@/domain/types';

export type GlyphName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY: Record<string, GlyphName> = {
  cat_food: 'restaurant-outline',
  cat_groceries: 'basket-outline',
  cat_transport: 'car-outline',
  cat_shopping: 'bag-handle-outline',
  cat_bills: 'flash-outline',
  cat_rent: 'home-outline',
  cat_entertainment: 'film-outline',
  cat_health: 'medkit-outline',
  cat_travel: 'airplane-outline',
  cat_education: 'book-outline',
  cat_subscriptions: 'repeat-outline',
  cat_other: 'receipt-outline',
  cat_salary: 'briefcase-outline',
  cat_freelance: 'laptop-outline',
  cat_interest: 'trending-up-outline',
  cat_refund: 'return-down-back-outline',
  cat_gift: 'gift-outline',
  cat_income_other: 'cash-outline',
};

/** Emoji a user may have picked for a custom category, mapped to the closest line icon. */
const EMOJI: Record<string, GlyphName> = {
  '🍜': 'restaurant-outline', '🍽️': 'restaurant-outline', '☕': 'cafe-outline', '🍕': 'pizza-outline', '🥬': 'basket-outline',
  '🚕': 'car-outline', '🚗': 'car-outline', '⛽': 'speedometer-outline', '🚌': 'bus-outline', '✈️': 'airplane-outline',
  '🛍️': 'bag-handle-outline', '👕': 'shirt-outline', '💡': 'flash-outline', '🏠': 'home-outline', '🎬': 'film-outline',
  '🎮': 'game-controller-outline', '💊': 'medkit-outline', '📚': 'book-outline', '🔁': 'repeat-outline', '🧾': 'receipt-outline',
  '💼': 'briefcase-outline', '🧑‍💻': 'laptop-outline', '📈': 'trending-up-outline', '↩️': 'return-down-back-outline', '🎁': 'gift-outline',
  '💰': 'cash-outline', '🐶': 'paw-outline', '🎓': 'school-outline', '🏋️': 'barbell-outline', '📱': 'phone-portrait-outline',
  '👶': 'happy-outline', '💄': 'sparkles-outline', '🛠️': 'construct-outline', '🍺': 'beer-outline', '🧘': 'leaf-outline', '🌱': 'leaf-outline', '💸': 'cash-outline',
};

export const categoryGlyph = (cat?: Pick<Category, 'id' | 'icon'> | null): GlyphName | null =>
  (cat && (CATEGORY[cat.id] ?? EMOJI[cat.icon])) || null;

/** Group icons: the picker stores one of these emoji; the UI draws the matching line icon. */
export const GROUP_ICONS: { value: string; glyph: GlyphName; label: string }[] = [
  { value: '👥', glyph: 'people-outline', label: 'People' },
  { value: '✈️', glyph: 'airplane-outline', label: 'Trip' },
  { value: '🏠', glyph: 'home-outline', label: 'Home' },
  { value: '🍽️', glyph: 'restaurant-outline', label: 'Food' },
  { value: '🎉', glyph: 'sparkles-outline', label: 'Party' },
  { value: '💼', glyph: 'briefcase-outline', label: 'Work' },
  { value: '🏖️', glyph: 'sunny-outline', label: 'Beach' },
  { value: '🎬', glyph: 'film-outline', label: 'Movies' },
];
export const groupGlyph = (emoji?: string | null): GlyphName => GROUP_ICONS.find((g) => g.value === emoji)?.glyph ?? 'people-outline';

export const accountGlyph = (type?: string | null): GlyphName =>
  type === 'bank' ? 'business-outline' : type === 'upi' ? 'phone-portrait-outline' : type === 'card' ? 'card-outline' : type === 'wallet' ? 'wallet-outline' : 'cash-outline';

/** Closest line icon for any stored emoji (categories first, then groups). */
export const emojiGlyph = (emoji?: string | null): GlyphName | null => (emoji ? EMOJI[emoji] ?? GROUP_ICONS.find((g) => g.value === emoji)?.glyph ?? null : null);

/** Icons offered for savings goals; the goal stores the key. */
export const GOAL_ICONS: { key: string; glyph: GlyphName; label: string }[] = [
  { key: 'target', glyph: 'flag-outline', label: 'Target' },
  { key: 'shield', glyph: 'shield-checkmark-outline', label: 'Safety' },
  { key: 'airplane', glyph: 'airplane-outline', label: 'Trip' },
  { key: 'phone', glyph: 'phone-portrait-outline', label: 'Gadget' },
  { key: 'gift', glyph: 'gift-outline', label: 'Gift' },
  { key: 'home', glyph: 'home-outline', label: 'Home' },
  { key: 'car', glyph: 'car-outline', label: 'Vehicle' },
  { key: 'school', glyph: 'school-outline', label: 'Study' },
  { key: 'heart', glyph: 'heart-outline', label: 'Family' },
  { key: 'laptop', glyph: 'laptop-outline', label: 'Work' },
];
export const goalGlyph = (key?: string | null): GlyphName => GOAL_ICONS.find((g) => g.key === key)?.glyph ?? 'flag-outline';
