# Azkar App repository instructions

## Mission
This repository contains a legacy static JavaScript PWA that should be treated as a legacy source for content, assets, and reference logic only.

The target direction is a new maintainable frontend architecture.

## Hard product constraints
- Remove Ads completely.
- Remove Nabtati completely.
- Keep Firebase only for Google Sign-In authentication.
- Do not implement Firestore sync.
- Do not implement cloud merge.
- Do not add prayer-times for now.
- `ayahs.json` is only for featured ayahs on the home page, not the full Quran.
- Theme modes must be only: `light`, `dark`, `system`.

## Required stack for the new app
- React
- Vite
- TypeScript
- Zustand
- Tailwind CSS
- daisyUI used selectively
- CSS Modules only for feature-local styling when truly needed

## Architecture rules
- Do not continue or patch the old static JS architecture unless explicitly asked.
- Treat old folders like `js/`, `css/`, and legacy runtime code as reference only.
- Migrate useful content/data/assets into `src/content`.
- Build a new app structure with:
  - `src/app`
  - `src/kernel`
  - `src/shared`
  - `src/features`
  - `src/content`
- Do not reuse legacy CSS blindly.
- Delete or isolate dead CSS and dead runtime references.
- Do not import feature code directly across unrelated features.
- Shared behavior must go through kernel services, shared stores, or typed contracts.

## Feature scope
Keep and migrate:
- Home
- Quran
- Azkar
- Duas
- Stories
- Names of Allah
- Tasks
- Settings
- Firebase Google Sign-In only

## UI/UX direction
- Mobile-first
- Modern
- Clean
- Light and uplifting
- Floating bottom dock navigation
- Rich home page with distributed cards
- Do not use one giant combined home card

## Home page requirements
The home page should include:
- message for you
- today strip
- featured ayah card from `ayahs.json`
- continue reading card
- daily azkar card
- dua of the day card
- name of Allah of the day card
- featured story card
- featured dua card
- random picks as separate small cards
- daily progress card
- quick access grid

## Styling rules
- Tailwind is the main styling system.
- daisyUI is optional and selective.
- Feature-specific styling may use CSS Modules.
- Avoid global legacy CSS accumulation.
- Prefer design tokens and shared UI primitives.

## Working style
- Start from root cause, not symptoms.
- Make minimal high-confidence changes first.
- Do not do broad refactors unless explicitly requested.
- If the repository is not runnable, prioritize buildability and runtime truth before redesign.
- After each significant change, run the relevant validation commands again.

## Validation
Always try to run:
- dependency install if needed
- typecheck
- build
- any existing tests relevant to the changed code

## Reporting
For each task, report:
1. root cause
2. files changed
3. commands run
4. validation result
5. remaining blockers