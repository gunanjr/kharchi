import type { AiAnswer, AiContext, AiProvider } from './types';

/**
 * STUB for a future server-backed assistant (e.g. Claude behind your own endpoint).
 * Rules for when it is implemented:
 *  - NEVER embed an API key in the app; call YOUR server, which holds the key.
 *  - Send only AGGREGATES (category totals, monthly sums), never raw transactions, SMS or merchant lists,
 *  - and only after explicit, revocable user consent.
 */
export class RemoteClaudeProvider implements AiProvider {
  readonly name = 'Cloud assistant (not connected)';
  constructor(private readonly endpoint: string | undefined = process.env.EXPO_PUBLIC_AI_ENDPOINT, private readonly consent: () => boolean = () => false) {}

  async answer(_q: string, _ctx: AiContext): Promise<AiAnswer> {
    if (!this.endpoint) throw new Error('No AI endpoint configured');
    if (!this.consent()) throw new Error('User has not consented to share aggregates');
    throw new Error('RemoteClaudeProvider is a stub: implement POST {question, aggregates} -> AiAnswer');
  }
}
