# Mood Swing — Mood-Based Music Discovery

A web application that turns a short mood quiz into a playlist and shows context (facts, related genres, lyrics links) next to each track.

Author: Sofya Asinskaya

## Project stages

| Stage | Folder | What it contains | How to run / read |
|---|---|---|---|
| 1. Database | [`database/`](database/) | PostgreSQL 16 schema, migrations, reference and demo data, 29 automated checks, ER diagram, data dictionary | [`database/README.md`](database/README.md) |
| 2. API documentation | [`api/`](api/) | OpenAPI 3 contract, published docs, error catalogue, quiz-to-playlist tutorial, mock server | [see below](#stage-2-api-documentation) |
| 3. Front-End SPA | [`frontend/`](frontend/) | React + TypeScript single-page app, tests, architecture and user-flow docs | [see below](#stage-3-front-end) |
| 3. Adaptive UI | [`design/`](design/) | Design tokens (single source of truth), mockups for phone, tablet and desktop, Figma link | [see below](#adaptive-ui-mockups) |

Each stage is tagged in Git: `stage-1-database`, `stage-2-api`, `stage-3-frontend`.

## Stage 2: API documentation

- Contract: [`api/openapi.yaml`](api/openapi.yaml)
- Rendered docs: [`api/docs/index.html`](api/docs/index.html) (open the file in a browser)
- Guides: [`getting-started`](api/docs/getting-started.md), [`tutorial: quiz to playlist`](api/docs/tutorial-quiz-to-playlist.md), [`errors`](api/docs/errors.md), [`architecture`](api/docs/architecture.md), [`changelog`](api/docs/changelog.md)

Run the mock server and lint the contract (Node 20+):

```bash
cd api
npm install
npm run lint     # validate openapi.yaml
npm run mock     # mock API on http://localhost:4010
npm run docs     # rebuild docs/index.html
```

## Stage 3: Front-End

React 19, TypeScript (strict), Vite, React Router, TanStack Query, Zustand, react-hook-form + zod. The app talks to the API from stage 2. Until the real backend is deployed, a mock API (MSW) with the same contract is used.

```bash
cd frontend
npm install
npm run dev:mock   # app on http://localhost:5173 with the mock API
npm run test       # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright)
npm run build      # production build
```

Documentation: [`architecture`](frontend/docs/architecture.md), [`user flows`](frontend/docs/user-flows.md), [`tech stack`](frontend/docs/tech-stack.md).

Where the criteria are implemented:

- Components, pages and services: `frontend/src/components`, `src/pages`, `src/api`
- Forms and validation: `frontend/src/lib/forms.ts` and the sign-in, register and quiz pages
- Global error handling: `frontend/src/api/globalErrorHandler.ts`, `errors.ts` and `components/ToastHost.tsx`
- Loading states: loading and error states in `frontend/src/components/ui.tsx` and the pages
- Tests: `frontend/src/**/*.test.ts(x)` (unit), `frontend/e2e/` (end-to-end)

## Adaptive UI mockups

- **Figma:** https://www.figma.com/design/YfUGStJHBuPh6xdfQIKPMn
- **Design tokens:** [`design/tokens/themes.css`](design/tokens/themes.css), used by the app and mirrored as variables in Figma
- **Themes:** Golden Vinyl (light) and Walkman Black (dark)

Adaptive behaviour in the code:

- Three layouts: bottom tab bar under 768 px, top bar from 768 px, sidebar from 1100 px. Main navigation is available on all of them.
- Relative units and a responsive grid, touch targets of at least 44 px, contrast of at least 4.5:1.
- Automated check for overflow, overlaps and small targets: `frontend/scripts/responsive-audit.cjs` and `frontend/e2e/responsive.spec.ts`.

## Secrets

No keys or passwords are stored in this repository. The database scripts take passwords as command-line variables, and the demo values in the READMEs are for local development only.