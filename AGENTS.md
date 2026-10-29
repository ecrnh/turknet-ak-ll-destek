<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Turkish-language mobile-first prototype rendered inside a 390x844 device frame (`src/components/layout/AppShell.tsx`); `/dashboard` renders full-width outside the frame. Why: presentation demo on desktop, real phone on mobile.
- No backend: all state lives in per-feature zustand stores persisted to localStorage with `skipHydration`, rehydrated once in AppShell before rendering. Why: avoids SSR hydration mismatches.
- Feature code lives in `src/features/{videoSupport,qrSupport,giftData,aiAgents,family,help,demo,core,workflow,scenario}`; page components in `src/screens`; route files in `src/routes` stay thin (import + head). Why: TanStack forbids `src/pages`; keeps routes declarative.
- Classic demo triggers and global reset/rehydrate live in `src/features/demo/scenarios.ts`; every new persisted store must be added to `resetAll`/`rehydrateAll` there. Why: one place for reset and hydration.
- Autonomous processes go through `src/features/workflow/engine.ts` (central statuses, dedupe keys, completion guards, audit, notifications, persisted delayed ops); services in `workflow/services/*` call only `mockServices.ts` adapters for external systems. Why: one state machine for all features, swappable for real APIs.
- Presenter scenarios (`src/features/scenario`) only call real service functions and derive step state from workflow data, never their own copies; `ScenarioDriver` runs the op queue and auto-play. Why: panel and phone can never diverge.
- Zustand selectors must return stored references; filter/sort after selecting. Why: selectors that build new arrays cause infinite re-render loops.
- All mock data and copy constants come from `src/data/mock.ts`. Why: single source for demo content.
- Overlays/sheets use `position: fixed` inside the transformed phone frame instead of Radix portals. Why: portals would escape the device frame.
- Business rules with tests live in pure modules (e.g. `src/features/giftData/gift.ts`) covered by `src/test/rules.test.ts` and `src/test/workflow.test.ts`.
- Analytics: call `track()` / `useFlow()` from `src/lib/analytics.ts`; events go to console and the app store for the dashboard.
