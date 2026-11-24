# Tutorial: from a mood quiz to an explained playlist

You will sign in, answer the quiz, generate a playlist, see why each track was chosen, change the familiar/discovery balance, rate the result and read a track page. About 10 minutes.

Prerequisites: the mock server running (`npm run mock`) or the real backend, and `curl`. Optional: `jq` (`brew install jq`) to extract values.

```bash
BASE=http://localhost:4010        # real backend: http://localhost:8080/api/v1
```

## Step 1. Sign in

```bash
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"correct-horse-battery"}' | jq -r .accessToken)
```

Expected: `TOKEN` holds a bearer token. Wrong credentials give `401 INVALID_CREDENTIALS`; five failures in 15 minutes give `429 RATE_LIMITED`.

## Step 2. Read the quiz

```bash
curl -s "$BASE/quiz" -H "Authorization: Bearer $TOKEN"
```

Expected `200`: 4 questions, each with 4 options (`questionId`, `optionId`, `label`). Show them in `position` order.

## Step 3. Submit the answers

Every question must be answered once, with an option of that question.

```bash
curl -s -X POST "$BASE/quiz-sessions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"familiarWeight":0.5,"answers":[
        {"questionId":1,"optionId":1},{"questionId":2,"optionId":5},
        {"questionId":3,"optionId":9},{"questionId":4,"optionId":13}]}'
```

Expected `201`: `{ "sessionId": 1, "quizDate": "2026-11-23", "familiarWeight": 0.5, "answerCount": 4 }`.

Edge cases to handle in your client:
- Only some questions answered: `422 QUIZ_INCOMPLETE` (`"2 of 4 required questions were answered."`). Show the missing questions.
- An option from another question: `422 VALIDATION_ERROR` with the offending field in `errors`.

## Step 4. Generate the playlist

```bash
curl -s -X POST "$BASE/quiz-sessions/1/playlists" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"limit":10}'
```

Expected `201` (shortened):

```json
{ "playlistId": 1, "familiarWeight": 0.5, "requestedLimit": 10, "moodFitRating": null,
  "limitationNotice": "Only 3 tracks matched your mood; showing all of them.",
  "items": [ { "position": 1, "trackId": 12, "title": "Wish You Were Here", "score": 2.42,
               "isFamiliar": true, "matchedTags": ["Calm","Melancholic","Nostalgic"] } ] }
```

- `matchedTags` is the explanation: the mood tags shared by the track and your answers. Show it next to each track.
- If fewer tracks than `limit` match, you still get all matches and a `limitationNotice`; show the notice instead of padding the list.

## Step 5. Change the familiar/discovery balance

`familiarWeight` goes from `0` (prefer new tracks) to `1` (prefer tracks already heard). Calling the endpoint again creates a **new** playlist for the same session:

```bash
curl -s -X POST "$BASE/quiz-sessions/1/playlists" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"limit":10,"familiarWeight":0.9}'
```

Scores of heard tracks rise (multiplier `0.5 + weight`) and scores of new tracks fall (`1.5 - weight`). Use the returned `playlistId` from now on.

## Step 6. Rate the playlist

```bash
curl -s -X PUT "$BASE/playlists/1/rating" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"moodFitRating":4}'
```

Expected `200`: `{ "playlistId": 1, "moodFitRating": 4, "ratedAt": "..." }`. The call is idempotent. A value outside 1–5 gives `422 VALIDATION_ERROR`.

## Step 7. Open a track page

```bash
curl -s "$BASE/tracks/9" -H "Authorization: Bearer $TOKEN"
```

Expected `200`: facts with their sources, related genres (metadata associations, not verified lineage), embed identifiers for an official player, and `lyrics` (a link and an optional short excerpt, or `null`). A missing id gives `404 NOT_FOUND`.

## Step 8. Record a play (needs consent)

```bash
curl -s -X PATCH "$BASE/users/me" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"historyConsent":true}'

curl -s -X POST "$BASE/listening-events" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 6f9619ff-8b86-4d11-b42d-00c04fc964ff" \
  -d '{"trackId":12,"playlistId":1,"listenedSeconds":42}'
```

Expected `201`. Without consent the second call returns `403 HISTORY_CONSENT_REQUIRED`: ask the user to enable listening history in the profile. Retrying with the same `Idempotency-Key` does not create a duplicate.

## Step 9. Read the personal feed

```bash
curl -s "$BASE/feed?limit=20" -H "Authorization: Bearer $TOKEN"
```

Expected `200` with facts about artists and tracks you listened to, newest first; continue with `cursor=<nextCursor>` until `nextCursor` is `null`. The feed is empty without consent or history.

## What you learned

Authenticate once, send the bearer token, treat `4xx` problem responses by their `code`, and show the explanation (`matchedTags`) and the limitation notice to the user. See [errors.md](errors.md) for every code.
