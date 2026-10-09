# Lung sound AI integration

## Configuration

Set server-only `AI_SERVER_URL=http://127.0.0.1:8000` in `.env.local` (restart Next.js after changing it). Existing `DIRECT_DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `LUNG_RECORDINGS_BUCKET=lung-recordings` are also required.

Run `npx drizzle-kit migrate`. Migration `0008_lung_sound_ai_integration.sql` was generated with `drizzle-kit generate --custom`, following the existing hand-authored migrations after snapshot 0002. Do not use `drizzle-kit push` to apply this migration.

## API

Both endpoints use the existing authenticated doctor session cookie:

- `POST /api/recordings/{recordingId}/analyze`: no request body. Returns the saved result for `completed`, or the current state for `analyzing` (both HTTP 200). Only `not_analyzed` and `failed` start inference: the backend creates a fresh 600-second private Storage URL and calls the AI service with a 120-second timeout.
- `GET /api/recordings/{recordingId}/analysis`: reads current state and persisted cycles.

Device completion automatically starts first-time analysis after validating and saving the WAV. It claims `analyzing` before returning the existing upload response, then runs inference using Next.js `after()`. Configure deployment request limits to allow 180 seconds for both complete and analyze routes. Concurrent/repeated completion requests share the same database-guarded decision. A failed AI call leaves the upload successful; retry failed analysis explicitly through the analyze endpoint, not through firmware completion retries.

Both return `{ data: { recording, cycles } }`. Recording includes the usual recording metadata plus `analysis_status`, `analyzed_at`, and `analysis_error`. Each cycle exposes `id`, `recording_id`, `cycle_index`, `start_seconds`, `end_seconds`, `duration_seconds`, `ai_label`, `ai_confidence`, `ai_probabilities`, `ai_status`, `ai_reason`, `ai_n_frames`, `doctor_label`, `review_status`, `created_at`, and `updated_at`. No signed URL or internal storage path is returned.

States: `not_analyzed`, `analyzing`, `completed`, `failed`. GET may be polled during POST. Empty cycle results can complete successfully. On a failed retry, previous cycles and the last successful `analyzed_at` remain available; consumers must use the status to distinguish these from a new successful result.

Errors use `{ error: { code, message } }`: 401 unauthenticated; 404 missing recording; 409 upload not ready, superseded run, or review conflict; 502 AI/network/response or storage failure; 503 missing AI configuration; 504 AI timeout. Internal failures return the existing generic 500 response. An already-running analysis is a normal 200 state response, not an error.

## Analyze once, read persisted results

A recording row lock makes the status check and transition to `analyzing` atomic, before generating any signed URL or calling AI. `completed` is terminal: later calls return database results without modifying cycle rows, IDs, timestamps, or doctor decisions. Successful empty cycle results are also terminal. GET endpoints and visit/review page loads never trigger inference; they display saved cycles and only poll GET while analysis is running.

An `analyzing` request is never reclaimed based on elapsed time. It returns the current persisted state and cannot launch a second inference. Network/AI failures are recorded as `failed` by the owning request and may be retried explicitly. If a process terminates without recording failure, recovery must first establish that the original job has stopped and transition its state to `failed`; page loads and duplicate requests do not do that implicitly.

For first-time or failed analysis, cycle persistence and completion status commit atomically. Unique `(recording_id, cycle_index)` and upserts prevent duplicates. Ownership is rechecked before persistence.

If a failed legacy analysis has existing reviewed cycles, retries must retain their index and start/end timing (within one microsecond). Changed or removed reviewed cycles reject the entire save with `REVIEW_CONFLICT`; old cycles remain intact. Removed pending cycles are deleted. New rows default to pending. Review writes lock the recording before cycle rows, matching this transaction's lock order. Successful analysis never reaches this replacement path again.

## Verification

`npm test` uses isolated PostgreSQL-compatible PGlite databases, the real Drizzle queries/migration SQL, and mocked AI HTTP/Storage/auth boundaries. Workflow tests count AI calls across first/repeated/concurrent complete and analyze requests, repeated visit/analysis reads, failed retries, old analyzing timestamps, and empty results. They verify unchanged cycle count, IDs, timestamps and doctor decisions. UI tests verify repeated visit and review page openings issue only reads. Tests do not access project env files or external services.
