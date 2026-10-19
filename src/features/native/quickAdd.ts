import { native } from './module';

/** Closes the translucent Quick Add window. Returns true if a native window was closed. */
export function finishQuickAdd(): boolean {
  try {
    return !!native?.finishQuickAdd?.();
  } catch {
    return false;
  }
}
