---
name: albosla-egyptian-copy
description: Style guide for البوصلة's Arabic UI copy — Egyptian colloquial (3amya), not MSA. Use when writing, reviewing, or fixing any Arabic user-facing text in the albosla app.
---

# البوصلة Arabic copy standard

All client-facing Arabic must be **Egyptian colloquial (3amya)**, warm and direct — matching the compass/quiz voice. Avoid فصحى/MSA.

## Terminology (fixed)
- The coach/mentor is always **"المنتور"** — never "المدربة"، "المدرب"، "المرشد".
- Brand name: **البوصلة** (keep as-is). English: "The Compass".

## MSA → Egyptian swaps (common)
| MSA (avoid) | Egyptian (use) |
|---|---|
| الآن | دلوقتي |
| اكتشف / استكشف | شوف / اتفرّج / لاقي |
| يمكنك | تقدر |
| لا يوجد / لا توجد | مفيش / لسه مفيش |
| هذا / هذه | ده / دي |
| الذي / التي / الذين | اللي |
| كيف | إزاي |
| سوف / سـ (future) | هـ (هيـ / هتـ) |
| وليس | مش / مش ... |
| قم بـ / اتخذ | خُد / اعمل |
| خذ | خُد |
| أين أنت الآن | انت فين دلوقتي |
| تعلّمت | اتعلمت |

## Where copy lives
Mixed: `messages/ar.json` (i18n keys) AND hardcoded inline `isAr ? "…" : "…"` across components (home `page.tsx`, `BookingFlow.tsx`, roadmap, compass `templates.ts`/`scoring.ts`/`eligibility.ts`). So dialect fixes can't all be done centrally — grep both.

## Review checklist
1. `grep -rnP 'المدرب|المرشد' src messages` → must be empty (all → المنتور).
2. Scan for MSA tells: `الآن|الذي|التي|الذين|يمكنك|لا يوجد|هذه|هذا|سوف|وليس|قم ب`.
3. Numbers in Arabic UI can stay Western or Arabic-Indic — be consistent per surface.
4. English must never leak into the Arabic UI (localize empty/error states, milestone titles, alt text).
