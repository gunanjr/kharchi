import { LocalRulesProvider } from './local';
import type { AiProvider } from './types';

/** Default provider is fully offline. */
export const aiProvider: AiProvider = new LocalRulesProvider();
export * from './types';
export { SUGGESTED_QUESTIONS } from './local';
