import { Easing, withDelay, withTiming, type LayoutAnimation } from 'react-native-reanimated';
import { motion } from './tokens';

/** The one easing curve used for anything entering or responding: a strong ease-out. */
export const easeOut = Easing.bezier(motion.ease[0], motion.ease[1], motion.ease[2], motion.ease[3]);

/** Staggered entrance: a short rise and fade, no springiness. Index is capped so long lists never wait. */
export const enterUp = (i = 0, distance = 12, duration: number = motion.base) => (values: { targetOriginY?: number }) => {
  'worklet';
  const cfg = { duration, easing: easeOut };
  const delay = Math.min(i, 10) * motion.stagger;
  return {
    initialValues: { opacity: 0, transform: [{ translateY: distance }] },
    animations: { opacity: withDelay(delay, withTiming(1, cfg)), transform: [{ translateY: withDelay(delay, withTiming(0, cfg)) }] },
  } as LayoutAnimation;
};
