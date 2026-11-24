# API documentation

Mood-Based Music Discovery API, version 1.0.0.

| Document | Purpose |
|---|---|
| [`../openapi.yaml`](../openapi.yaml) | The contract: every endpoint, schema, example and error (OpenAPI 3.1). Source of truth. |
| [`index.html`](index.html) | The same contract rendered with Redoc (open in a browser, no server needed). |
| [`getting-started.md`](getting-started.md) | Base URL, authentication, first request, conventions (pagination, idempotency, rate limits, versioning). |
| [`tutorial-quiz-to-playlist.md`](tutorial-quiz-to-playlist.md) | Step-by-step integration: sign in, take the quiz, get an explained playlist, rate it, read track context. |
| [`architecture.md`](architecture.md) | System context, request flow and the ranking lifecycle. |
| [`errors.md`](errors.md) | Error structure, the full list of error codes and how to recover from each. |
| [`changelog.md`](changelog.md) | Release notes and versioning policy. |

## Documentation strategy

- **Spec first.** `openapi.yaml` is written and reviewed before the backend exists. The frontend develops against the mock server and the backend implements the contract. The generated documentation of the finished backend must match this file (NFR-07).
- **Standards:** OpenAPI 3.1, RFC 9457 problem details for errors, bearer tokens (JWT), ISO 8601 timestamps, cursor pagination.
- **Tools:** Redocly CLI (lint + static HTML), Prism (mock server). Commands: `npm install`, then `npm run lint`, `npm run mock`, `npm run docs`.
- **Naming:** JSON properties in `camelCase`; resources are plural nouns (`/playlists`, `/quiz-sessions`); error `code` values are `UPPER_SNAKE_CASE`; identifiers are integers.
- **Versioning:** the major version is in the path (`/api/v1`). Additive changes (new optional fields, new endpoints) stay in v1 and are recorded in the changelog; removals or meaning changes need `/api/v2`.
- **Layout:** `openapi.yaml` (reference), `docs/` (guides and generated HTML). Examples live inside the spec so they cannot drift from the schemas; the linter checks them.
- **Known gaps:** the spec is not yet verified against a real implementation (there is none); the shared `VALIDATION_ERROR` example shows an `email` field error even on endpoints without an e-mail field; no contract tests (Pact) or sandbox yet; `ETag`/conditional requests and webhooks are out of scope for v1.
