# Design system: "Ink & Marigold"

Mirror of `src/theme/tokens.ts`. Change both together.

**Idea:** a well-kept ledger, not a finance dashboard. A warm stone page, white cards, one deep ink surface for the number that matters, and a single marigold accent. Money is the main character: big tabular figures with the paise set quieter.

## Colour
| Role | Light | Dark |
|---|---|---|
| bg | #F3F1EC | #0F0E12 |
| surface | #FFFFFF | #1A1920 |
| text / muted / subtle | #16130E / #645D52 / #938B7E | #F4F2EE / #A8A298 / #7D776D |
| ink (hero cards, primary buttons, selected chips, tab capsule) | #1C1A22 | #F4F2EE (inverted) |
| primary (marigold, fills only) | #F0A31B | #F5B33A |
| link (text on white) | #9A5A00 | #F5B33A |
| income / expense | #1B7F57 / #B8402F | #5FD0A0 / #EE8A78 |

Rules:
- Marigold is for fills (FAB, bars, dots, the AI tile), never for body text. Links use `link`.
- Green means income or "you are owed". Red means owing, over budget or negative. Ordinary expense rows stay ink.
- On ink cards use `incomeOnInk` / `expenseOnInk`.
- Category colours are a warm-to-cool ramp (`chartColors`). Old stored colours are mapped with `toneOf()`, so no data migration.

## Type
**Geist** 400 / 500 / 600 / 700. Money always uses tabular figures; the paise are drawn at lower opacity (`Money`). Big amounts shrink to fit their width. Scale: hero 44, h1 30, h2 22, h3 17, title 16, body 15, small 13, caps 11.

## Shape, space, depth
Radius 10 / 16 / 24 / 32 / pill, continuous corners. Gutter 20, card padding 20. Cards are white with a hairline edge and a soft shadow. Floating things (tab capsule, FAB, toast, sheets) use the stronger `floating` shadow. Minimum target 48dp.

## Signature pieces
- **IconTile**: squircle tile holding a line glyph in the category tone. One icon language (Ionicons outline); stored emoji are drawn through lookups in `src/components/glyphs.ts`, so categories, accounts and groups need no migration.
- **Rings / Emblem**: concentric rings behind the hero amount and on empty, onboarding, privacy and lock screens.
- **Floating tab capsule**: an ink pill slides between tabs.
- **Pulse widgets on Home**: Safe to spend today (from the overall budget) with a 7-day rhythm, an accounts strip, and Coming up (recurring due in 10 days). All local data, see `features/tracker/pulse.ts`.

## Motion
Strong ease-out `[0.23, 1, 0.32, 1]` for everything that enters or responds; never ease-in, no bounce. Press scale 0.97 (90 ms in, 150 ms out), enter 260 ms with a 12 px rise and 45 ms stagger, sheets 340 ms, count-up 700 ms. All of it collapses under OS reduce-motion.

## Principles
1. One primary action per screen (the FAB or one ink button).
2. Say what happened in human words ("You owe Asha ₹500").
3. Every list has a skeleton, an honest empty state and an error state with retry.
4. Colour is never the only signal (arrows, words and labels back it up).
5. Copy is plain and professional: no em dashes, no cute praise.
6. Privacy-first holds for new features too: nothing may need the network, SMS, camera, contacts or location.
