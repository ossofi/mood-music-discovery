# Technology choices

| Choice                         | Why                                                                             | Alternative considered      |
| ------------------------------ | ------------------------------------------------------------------------------- | --------------------------- |
| React 19 + TypeScript (strict) | Component model, typed API contract, large ecosystem                            | Vue, Svelte                 |
| Vite                           | Fast dev server, simple config, native ESM                                      | CRA (deprecated), webpack   |
| React Router                   | Standard routing, protected routes by layout route                              | TanStack Router             |
| TanStack Query                 | Caching, retries, pagination, invalidation without hand-written reducers        | Redux Toolkit Query, SWR    |
| Zustand                        | Tiny store for session, theme and toasts; no boilerplate                        | Redux, Context              |
| react-hook-form + zod          | Few re-renders, schema validation shared with types                             | Formik, Yup                 |
| MSW                            | Same handlers for browser demo and tests; no code changes to switch to real API | json-server, Prism          |
| Vitest + Testing Library       | Same config as Vite; tests describe behaviour the user sees                     | Jest                        |
| Playwright                     | Real browser, desktop and phone viewport                                        | Cypress                     |
| CSS custom properties          | Themes are one attribute switch; no runtime library                             | styled-components, Tailwind |
| ESLint + Prettier              | `no-explicit-any`, `no-console` (use `lib/logger`), consistent style            | Biome                       |
