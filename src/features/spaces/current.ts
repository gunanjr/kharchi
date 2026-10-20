import { useSettings } from '@/store/settings';

/**
 * Spaces (Pro): separate books on one phone. Every entry has an optional `space_id`; no id means Personal.
 * The active space filters every total, list and chart. With no spaces created, everything is Personal and nothing
 * changes for the user.
 */
export const PERSONAL = '';
export const activeSpace = (): string => {
  try { return useSettings.getState().activeSpace ?? PERSONAL; } catch { return PERSONAL; }
};

/** SQL fragment and parameter that limit a transactions query to the active space. */
export function spaceFilter(space = activeSpace()): { sql: string; params: string[] } {
  return { sql: " AND COALESCE(space_id,'')=?", params: [space] };
}
