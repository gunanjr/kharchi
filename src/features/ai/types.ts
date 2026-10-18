export type ChartSpec =
  | { kind: 'bars'; rows: { label: string; value: number; color?: string }[] }
  | { kind: 'donut'; slices: { label: string; value: number; color?: string }[] }
  | { kind: 'line'; actual: number[]; projected: number[] };

export interface AiAnswer {
  text: string;
  chart?: ChartSpec;
  /** follow-up suggestions */
  followUps?: string[];
}

export interface AiContext {
  db: import('@/db/types').Db;
  now: number;
}

/** Swap implementations without touching the UI. */
export interface AiProvider {
  readonly name: string;
  answer(question: string, ctx: AiContext): Promise<AiAnswer>;
}
