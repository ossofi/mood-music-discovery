# Mood Swing — Front-End (SPA)

React + TypeScript single-page app for **Mood-Based Music Discovery**: sign in, take a four-question mood quiz, get a ranked playlist, rate it, read facts about the music, and keep an optional listening history.

The app is built against the API contract in [`../api/openapi.yaml`](../api/openapi.yaml). **There is no real backend yet**, so by default it runs against an in-browser mock server (MSW) that follows the same contract and mirrors the seed data and ranking rule of the database in `../database`.

## Quick start

```bash
cd frontend
npm install
npm run dev:mock        # http://localhost:5173 with the mock API
```

Demo account: `alice@example.com` / `correct-horse-battery`.

| Command                                 | What it does                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:mock`                      | dev server + mock API (no backend needed)                                                                               |
| `npm run dev`                           | dev server; `/api` is proxied to `http://localhost:8080` (real backend)                                                 |
| `npm test`                              | unit and component tests (Vitest + Testing Library + MSW)                                                               |
| `npm run e2e`                           | end-to-end tests (Playwright; add `PW_CHROME=1` to use installed Chrome, or run `npx playwright install chromium` once) |
| `npm run lint` / `npm run format:check` | ESLint / Prettier                                                                                                       |
| `npm run typecheck`                     | TypeScript (strict)                                                                                                     |
| `npm run build`                         | production build into `dist/`                                                                                           |

Configuration is in `.env.example` (`VITE_API_MOCK`, `VITE_API_BASE`). No secrets are stored in the front-end.

## Project structure

```
src/
  api/        types.ts (contract), client.ts (fetch + errors), queries.ts (TanStack Query hooks),
              globalErrorHandler.ts (one place for failed requests), errors.ts (human messages)
  stores/     auth (sessionStorage), theme (localStorage), toasts
  components/ AppShell (responsive nav), ui.tsx (Button, Skeleton, ErrorState...), TextField, ToastHost
  pages/      Login/Register, Quiz, Playlist(s), Track, Feed, Profile, NotFound
  mocks/      MSW handlers + seed data + ranking (mirror of the database)
  styles/     base.css (components); the two themes live in ../design/tokens/themes.css
  lib/        logger, form helpers, feed filter
e2e/          Playwright specs
docs/         architecture, user flows, tech stack
```

## Documentation

- [Architecture and approach](docs/architecture.md) (diagram, state management, error handling)
- [User flows](docs/user-flows.md)
- [Technology choices](docs/tech-stack.md)
- Design tokens and themes: [`../design/tokens/themes.css`](../design/tokens/themes.css)

## Requirement coverage

| Requirement                  | Where                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Registration, login, session | `pages/AuthPages.tsx`, `stores/authStore.ts`, `ProtectedRoute`                          |
| Mood quiz and playlist       | `pages/QuizPage.tsx`, `PlaylistPage.tsx`                                                |
| Filter, search, sort         | `pages/FeedPage.tsx`, `lib/feedFilter.ts`                                               |
| Forms with validation        | react-hook-form + zod, server errors mapped to fields                                   |
| Global error handling        | `api/globalErrorHandler.ts` (toasts, 401 sign-out, retry)                               |
| Loading and empty states     | `Skeleton`, `EmptyState`, `ErrorState`                                                  |
| State management             | TanStack Query (server) + Zustand (client)                                              |
| Responsive, 3 layouts        | phone tab bar, tablet top nav, desktop sidebar (`AppShell`)                             |
| Two themes                   | `themes.css`, `ThemeSwitcher`                                                           |
| Accessibility                | labels, `aria-*`, focus ring, 44 px targets, contrast-checked tokens, keyboard-only use |
| Tests                        | 18 unit/component tests, 4 e2e tests                                                    |

## Adaptive UI (stage 3)

- **Mockups in Figma:** https://www.figma.com/design/YfUGStJHBuPh6xdfQIKPMn (components, phone / tablet / desktop, both themes).
- **Layouts:** bottom tab bar under 768 px, top bar from 768 px, sidebar from 1100 px; main navigation is present on all of them (`components/AppShell.tsx`).
- **Checks:** `e2e/responsive.spec.ts` (phone, tablet, desktop, landscape, zoom) and `scripts/responsive-audit.cjs` (overflow, overlaps, targets under 44 px, clipped text). Colour contrast of the tokens is at least 4.5:1.
- **Not covered by automation:** real devices, screen readers.

## Known limits

- The mock API stands in for the backend. Ranking weights, quiz weights and facts are draft data.
- The music player is a placeholder; real embeds need a catalogue/streaming integration.
- Fonts load from Google Fonts; without a connection the fallbacks in `themes.css` are used.
- The production bundle also contains the mock chunk (loaded only when `VITE_API_MOCK=true`).