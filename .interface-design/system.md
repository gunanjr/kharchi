# Design system: "Saffron & Ink"

Mirror of `src/theme/tokens.ts`. Change both together.

**Idea:** a ledger book that got a glow-up. Warm paper, ink-black text, one confident terracotta, a deep teal for "good" money. Big serif numerals make money feel like the main character.

## Colour
| Role | Light | Dark |
|---|---|---|
| bg | #F6EEDF | #14100B |
| surface | #FFFAF0 | #1E1913 |
| text | #1E1812 | #F5ECDC |
| muted | #6B5F4F (AA) | #B3A691 |
| primary | #B8400E terracotta | #F29A52 amber |
| accent | #0E5A52 teal | #5CC4B4 |
| income / expense | #0E6B4F / #A8321E | #6FD3A5 / #F0836F |
Avoid: default Material/iOS blue, purple-on-white, flat grey cards.

## Type
- Display + money: **Fraunces** 600/700 (characterful, warm serif).
- Text: **DM Sans** 400/500/700.
- Never Inter/Roboto/Arial/Space Grotesk. Money always uses tabular figures.
- Scale: hero 44 / h1 28 / h2 21 / title 16 / body 15 / small 13 / caps 11.

## Shape & space
Radius 8/14/22/pill. Spacing 4/8/12/16/24/32. Minimum touch target 48dp. Cards are paper with a hairline border, no heavy shadows.

## Motion
Count-up on totals (700ms ease-out), staggered list entrance (45ms steps, spring), spring sheets (damping 18), skeleton shimmer, light haptics on commit actions. All motion collapses when OS reduce-motion is on.

## Principles
1. One primary action per screen (FAB or one filled button).
2. Say what happened in human words ("You owe Asha ₹500").
3. Every list has a skeleton, an empty state with an illustration, and an error state with retry.
4. Colour is never the only signal (arrows, words, labels back it up).
