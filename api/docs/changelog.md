# Changelog

Format: [Keep a Changelog](https://keepachangelog.com). Versions follow the API major version in the path.

## Versioning policy

- `/api/v1` is stable. Additive changes (new endpoints, new optional request fields, new response fields) are released within v1 and listed here; clients must ignore unknown response fields.
- Breaking changes (removed or renamed fields, changed meaning, new required request fields) require `/api/v2`. v1 stays available for at least 6 months after v2 is released.
- Deprecations are announced here first and marked `deprecated: true` in `openapi.yaml`.

## [1.0.0] - 2026-11-23

### Added
- Auth: register, login, logout (24-hour bearer tokens).
- Profile: current user, history consent, erasure of account and history.
- Quiz: questions, quiz sessions.
- Playlists: generation with a familiar/discovery balance, explained items, listing, mood-fit rating.
- Catalogue: track and artist pages with source-attributed facts.
- Activity: listening events (with `Idempotency-Key`), personal feed (cursor pagination).
- System: health check.
- Error model: RFC 9457 problem details with stable `code` values.
