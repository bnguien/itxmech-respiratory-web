import type { OpenApiPathItem } from "../types";

const label = { type: "string", enum: ["normal", "crackle", "wheeze", "both"], nullable: true };
const response = {
  description: "Recording analysis state and persisted respiratory cycles.",
  content: { "application/json": { schema: {
    type: "object", properties: { data: { type: "object", properties: {
      recording: { allOf: [{ $ref: "#/components/schemas/Recording" }, { type: "object", properties: {
        analysis_status: { type: "string", enum: ["not_analyzed", "analyzing", "completed", "failed"] },
        analyzed_at: { type: "string", format: "date-time", nullable: true },
        analysis_error: { type: "string", nullable: true },
      } }] },
      cycles: { type: "array", items: { type: "object", properties: {
        id: { type: "string", format: "uuid" }, recording_id: { type: "string", format: "uuid" },
        cycle_index: { type: "integer" }, start_seconds: { type: "number" }, end_seconds: { type: "number" }, duration_seconds: { type: "number" },
        ai_label: label, ai_confidence: { type: "number", nullable: true, minimum: 0, maximum: 1 },
        ai_probabilities: { type: "object", nullable: true, properties: Object.fromEntries(["normal", "crackle", "wheeze", "both"].map((key) => [key, { type: "number", minimum: 0, maximum: 1 }])) },
        ai_status: { type: "string", enum: ["processed", "unprocessable"] }, ai_reason: { type: "string", nullable: true }, ai_n_frames: { type: "integer", nullable: true },
        doctor_label: label, review_status: { type: "string", enum: ["pending", "confirmed", "corrected"] },
        created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" },
      } } },
    } } },
  } } },
};
const common = {
  tags: ["Recordings"],
  description: "Requires an authenticated doctor session cookie. Returns data.recording and data.cycles; does not expose private storage URLs.",
  parameters: [{ name: "recordingId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
  responses: {
    "200": response,
    "401": { $ref: "#/components/responses/Unauthorized" },
    "404": { $ref: "#/components/responses/NotFound" },
    "500": { $ref: "#/components/responses/InternalError" },
  },
};
export const analysisPaths = {
  "/api/recordings/{recordingId}/cycles/{cycleId}/review": { patch: {
    ...common, operationId: "reviewRecordingCycle", summary: "Confirm or correct one respiratory cycle",
    description: "Requires the existing doctor session. Saves only doctor_label/review_status. Confirmation snapshots the current AI label. Rejects boundary changes, in-progress analysis and stale expected_updated_at values.",
    parameters: [...common.parameters, { name: "cycleId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
    requestBody: { required: true, content: { "application/json": { schema: { oneOf: [
      { type: "object", additionalProperties: false, required: ["action", "expected_updated_at"], properties: { action: { type: "string", enum: ["confirm"] }, expected_updated_at: { type: "string", description: "Exact updated_at value returned for the cycle." } } },
      { type: "object", additionalProperties: false, required: ["action", "doctor_label", "expected_updated_at"], properties: { action: { type: "string", enum: ["correct"] }, doctor_label: { type: "string", enum: ["normal", "crackle", "wheeze", "both"] }, expected_updated_at: { type: "string" } } },
    ] } } } },
    responses: { ...common.responses, "400": { description: "Invalid review, classification, version or unexpected fields." }, "409": { description: "Analysis in progress, stale cycle version, or no AI result to confirm." } },
  } },
  "/api/recordings/{recordingId}/analysis": { get: { ...common, operationId: "getRecordingAnalysis", summary: "Read respiratory cycle analysis" } },
  "/api/recordings/{recordingId}/analyze": { post: {
    ...common, operationId: "analyzeRecording", summary: "Analyze an uploaded WAV recording",
    description: `${common.description} No request body. Completed analysis is reused without generating a signed URL, calling AI, or changing any cycle/review fields. Analyzing returns the current state with HTTP 200. Only not_analyzed or failed starts inference. Successful empty results are also final. Failed legacy retries preserve reviews for matching timing; changed reviewed cycles return REVIEW_CONFLICT.`,
    responses: { ...common.responses,
      "409": { description: "Recording not uploaded, superseded analysis, or reviewed cycle timing conflict." },
      "502": { description: "AI service, malformed AI response, or private audio access failure." },
      "503": { description: "AI service not configured." },
      "504": { description: "AI service timed out." },
    },
  } },
} satisfies Record<string, OpenApiPathItem>;
