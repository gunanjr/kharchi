import { native } from './module';

let quick: boolean | null = null;
/** True if this process was started by the tile / launcher shortcut / widget (so closing should return to the previous app). */
export function quitIfQuickLaunch(): boolean {
  if (quick === null) quick = native?.consumeLaunchMode?.() === 'quick';
  return quick;
}
