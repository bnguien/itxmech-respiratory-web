# Lung Sound AI Review

Open **Phân tích & đánh giá AI** from an uploaded recording in a visit, or **Đánh giá AI** in the patient's recording list. The review page uses `/recordings/{recording UUID}` and the persisted analysis API. It no longer renders the mock `REC-*` detail records.

## Interaction

- The waveform has no horizontal cycle-chip row or caption strip. Read-only waveform regions select a cycle and seek to its start; regions support Enter/Space as well as pointer clicks. Each cycle occupies one full-width row below the player, rather than a multi-column grid.
- Each row's play action plays just that segment and pauses at its end. The main player keeps full-recording play/pause, seek and volume controls.
- Confirm and edit-label actions are inside each row. Editing opens a local label selector with Save/Cancel, keeping immutable timing, original AI label, effective label and review status visible. There is no separate review panel. Saving the original AI label is treated as confirmation.
- Visit details use the same inline review rows directly below the waveform. Doctors can play, confirm or correct individual cycles there without navigating to a separate page. Saves use the same protected review endpoint and update review progress in place. Cancel never writes, and saving a different row preserves other unsaved drafts.
- Displayed classification is `doctor_label ?? ai_label`. Confidence and probability scores are not displayed anywhere in the clinical UI (including legacy recordings, patient views, waveform chips and alert text). The backend still persists the original prediction data. Missing classifications are shown as unavailable, never as Normal.
- Confirm/correct actions update the UI only after a successful save. The audio instance stays mounted when review labels change.
- Pending, confirmed and corrected progress is counted from persisted cycles. Analysis-in-progress is polled; review writes are disabled until it finishes. Failed reanalysis keeps previous cycles visible with an explicit previous-result message.
- Successful upload automatically starts first-time inference. Opening a visit or review page only reads saved analysis. Completed results are reused permanently; the manual action is for an unanalysed recording or a failed attempt. A concurrent analyze request returns the current analyzing state and the UI continues polling GET.

The four classification colors are shared across live and legacy views: Normal green (`#22C55E`), Crackle orange (`#F59E0B`), Wheeze purple (`#8B5CF6`), Both red (`#EF4444`). Badges and selectors use darker companion text for contrast. Waveform colors are drawn on the decoded audio bars themselves, with a thin colored underline and transparent hit regions on a white background. Selection thickens the underline without filling the segment. Cycle names appear in the detail rows, not above the waveform. Playback retains those colors after the cursor passes, and doctor corrections repaint the existing waveform without reloading audio. App navigation, review statuses, cards and spacing keep their existing design tokens.

## Review API

`PATCH /api/recordings/{recordingId}/cycles/{cycleId}/review` uses the existing doctor authentication helper and `{ data: { recording, cycles } }` response format.

```json
{ "action": "confirm", "expected_updated_at": "<cycle.updated_at>" }
```

```json
{ "action": "correct", "doctor_label": "wheeze", "expected_updated_at": "<cycle.updated_at>" }
```

Corrections allow only `normal`, `crackle`, `wheeze`, `both`. Confirmation snapshots the AI label into `doctor_label`, preserving the accepted classification across later AI retries. AI data and cycle timing are never changed by this endpoint. Extra request fields are rejected.

The transaction locks the recording before the cycle, matching analysis persistence. A cycle must belong to the requested recording. An active analysis or stale `expected_updated_at` returns 409; the UI offers a result reload rather than overwriting another review. No database migration or new configuration is required.

## Tests

`npm test` runs React Testing Library UI tests with mocked HTTP/audio boundaries, and review persistence tests against an isolated in-memory PostgreSQL-compatible PGlite database. Tests do not load project env files or use external services.
