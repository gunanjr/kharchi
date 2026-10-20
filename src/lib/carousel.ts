import { useWindowDimensions } from 'react-native';
import { layout, space } from '@/theme/tokens';

/**
 * Sizes for a sideways card strip so that exactly `n` cards fill the screen between the side gutters. Nothing of the
 * next card shows until the user swipes; scrolling is free and fast (no snapping), so long strips are quick to browse.
 */
export function useCarousel(n = 2) {
  const { width } = useWindowDimensions();
  const gap = space.md;
  const card = Math.floor((width - layout.gutter * 2 - gap * (n - 1)) / n);
  return {
    card,
    gap,
    props: {
      horizontal: true as const,
      showsHorizontalScrollIndicator: false,
      decelerationRate: 'normal' as const,
    },
  };
}
