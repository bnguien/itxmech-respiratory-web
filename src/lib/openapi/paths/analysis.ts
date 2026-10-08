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
  "/api/recordings/{recordingId}/analysis": { get: { ...common, operationId: "getRecordingAnalysis", summary: "Read respiratory cycle analysis" } },
  "/api/recordings/{recordingId}/analyze": { post: {
    ...common, operationId: "analyzeRecording", summary: "Analyze an uploaded WAV recording",
    description: `${common.description} No request body. Generates a fresh signed URL on the backend. Retries preserve reviews for matching cycle timing; changed reviewed cycles return REVIEW_CONFLICT.`,
    responses: { ...common.responses,
      "409": { description: "Recording not uploaded, analysis in progress/superseded, or reviewed cycle timing conflict." },
      "502": { description: "AI service, malformed AI response, or private audio access failure." },
      "503": { description: "AI service not configured." },
      "504": { description: "AI service timed out." },
    },
  } },
} satisfies Record<string, OpenApiPathItem>;
