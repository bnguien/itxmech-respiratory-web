# Lung sound AI integration

## Configuration

Set server-only `AI_SERVER_URL=http://127.0.0.1:8000` in `.env.local` (restart Next.js after changing it). Existing `DIRECT_DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `LUNG_RECORDINGS_BUCKET=lung-recordings` are also required.

Run `npx drizzle-kit migrate`. Migration `0008_lung_sound_ai_integration.sql` was generated with `drizzle-kit generate --custom`, following the existing hand-authored migrations after snapshot 0002. Do not use `drizzle-kit push` to apply this migration.

## API

Both endpoints use the existing authenticated doctor session cookie:

- `POST /api/recordings/{recordingId}/analyze`: no request body. Backend creates a fresh 600-second private Storage URL and calls the AI service with a 120-second timeout. Configure deployment request limits to allow 180 seconds.
- `GET /api/recordings/{recordingId}/analysis`: reads current state and persisted cycles.

Both return `{ data: { recording, cycles } }`. Recording includes the usual recording metadata plus `analysis_status`, `analyzed_at`, and `analysis_error`. Each cycle exposes `id`, `recording_id`, `cycle_index`, `start_seconds`, `end_seconds`, `duration_seconds`, `ai_label`, `ai_confidence`, `ai_probabilities`, `ai_status`, `ai_reason`, `ai_n_frames`, `doctor_label`, `review_status`, `created_at`, and `updated_at`. No signed URL or internal storage path is returned.

States: `not_analyzed`, `analyzing`, `completed`, `failed`. GET may be polled during POST. Empty cycle results can complete successfully. On a failed retry, previous cycles and the last successful `analyzed_at` remain available; consumers must use the status to distinguish these from a new successful result.

Errors use `{ error: { code, message } }`: 401 unauthenticated; 404 missing recording; 409 upload not ready, analysis already running, superseded run, or review conflict; 502 AI/network/response or storage failure; 503 missing AI configuration; 504 AI timeout. Internal failures return the existing generic 500 response.

## Retry and review semantics

A row lock and persisted five-minute lease prevent concurrent analyses; a stale lease can be reclaimed after a crashed request. Lease ownership is rechecked before saving. Cycle replacement and completion status commit atomically. Unique `(recording_id, cycle_index)` and upserts preserve matching row IDs and all doctor review fields.

Reviewed cycles (non-pending status or non-null doctor label) must retain index and start/end timing (within one microsecond). Changed or removed reviewed cycles reject the entire save with `REVIEW_CONFLICT`; old cycles remain intact. Removed pending cycles are deleted. New rows default to pending. Future review-write endpoints should lock the recording before cycle rows, matching this transaction's lock order.

## Verification

`npm test` uses isolated PostgreSQL-compatible PGlite databases, the real Drizzle queries/migration SQL, and mocked AI HTTP/Storage/auth boundaries.

With local AI and Next.js running, use:

```sh
node scripts/verify-lung-sound-ai.mjs RECORDING_UUID
```

This opt-in live check persists analysis for an existing uploaded recording, calls POST twice, checks stable IDs and database uniqueness, reads GET, and verifies unauthorized access. It creates and removes a temporary authenticated doctor account; it never prints tokens or signed URLs.
