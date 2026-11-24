# Errors

All errors use `application/problem+json` (RFC 9457):

```json
{ "type": "https://api.moodmusic.example/problems/validation-error", "title": "Validation failed",
  "status": 422, "code": "VALIDATION_ERROR", "detail": "One or more fields are invalid.",
  "errors": [ { "field": "email", "message": "Must be a valid e-mail address." } ],
  "traceId": "0f3a9c2e7b1d4c58" }
```

Branch on `code` (stable), not on `title` or `detail` (human text, may change). `errors` appears for validation failures; `traceId` for server errors.

| Status | `code` | Meaning | What the client should do |
|---|---|---|---|
| 401 | `UNAUTHENTICATED` | Token missing or invalid | Send the user to sign in |
| 401 | `TOKEN_EXPIRED` | Token older than 24 hours | Sign in again, then repeat the request |
| 401 | `INVALID_CREDENTIALS` | Wrong e-mail or password | Show a generic message; do not say which field |
| 403 | `FORBIDDEN` | Not allowed to use this resource | Show an access message |
| 403 | `HISTORY_CONSENT_REQUIRED` | Listening history is switched off | Offer to enable it in the profile, then retry |
| 404 | `NOT_FOUND` | Resource does not exist or is not yours | Show "not found"; go back |
| 409 | `EMAIL_ALREADY_REGISTERED` | E-mail already used | Offer sign-in or password recovery |
| 422 | `VALIDATION_ERROR` | A field is missing or invalid | Show each `errors[].message` next to its field |
| 422 | `QUIZ_INCOMPLETE` | Not every question was answered | Highlight the unanswered questions |
| 429 | `RATE_LIMITED` | Too many failed logins | Wait `Retry-After` seconds; disable the button meanwhile |
| 500 | `INTERNAL_ERROR` | Unexpected server error | Retry later; show `traceId` to support |
| 503 | (health only) | Database unreachable | Show a service-unavailable message |

Notes:
- A resource that belongs to another user is reported as `404`, not `403`, so ids cannot be probed.
- `401` for an unknown e-mail and for a wrong password look identical on purpose.
- Retry only idempotent requests (`GET`, `PUT`, `DELETE`, or a `POST` with an `Idempotency-Key`).
