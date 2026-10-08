import type { OpenApiPathItem } from "../types";

const doctorSecurity = [{ bearerAuth: [] }];
const deviceSecurity = [{ deviceKey: [] }];
const uuidParam = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
});
const errors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "404": { $ref: "#/components/responses/NotFound" },
  "409": { $ref: "#/components/responses/Conflict" },
  "500": { $ref: "#/components/responses/InternalError" },
};

export const recordingPaths = {
  "/api/device/visits/{visitId}/recording/upload-url": {
    post: {
      tags: ["Recordings"],
      summary: "Cấp signed URL upload WAV cho firmware",
      operationId: "createRecordingUploadUrl",
      security: deviceSecurity,
      description:
        "Idempotent với recording waiting_upload/failed và chống tạo trùng bằng UNIQUE(visit_id). Firmware PUT WAV binary trực tiếp lên signed URL với Content-Type audio/wav.",
      parameters: [
        uuidParam("visitId"),
        {
          name: "X-Device-Key",
          in: "header",
          required: true,
          schema: { type: "string" },
          description: "Device key; tài liệu không chứa giá trị thật.",
        },
      ],
      responses: {
        "200": {
          description: "Signed upload URL thời hạn ngắn.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeviceUploadUrlResponse" },
            },
          },
        },
        ...errors,
      },
    },
  },
  "/api/device/recordings/{recordingId}/complete": {
    post: {
      tags: ["Recordings"],
      summary: "Xác minh và hoàn tất bản ghi WAV",
      operationId: "completeRecording",
      security: deviceSecurity,
      description:
        "Idempotent khi đã uploaded. Server xác minh object và WAV PCM mono, 16-bit, 16 kHz; metadata firmware chỉ là gợi ý.",
      parameters: [
        uuidParam("recordingId"),
        {
          name: "X-Device-Key",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CompleteRecordingRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Recording đã được xác minh.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecordingResponse" },
            },
          },
        },
        "413": {
          description: "WAV vượt quá 50 MB.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "415": {
          description: "Không phải WAV PCM hỗ trợ.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ...errors,
      },
    },
  },
  "/api/patients/{patientId}/visits/{visitId}/recording": {
    get: {
      tags: ["Recordings"],
      summary: "Lấy recording của một Visit",
      operationId: "getVisitRecording",
      security: doctorSecurity,
      description:
        "Mọi bác sĩ đã đăng nhập được xem; Visit phải thuộc patient trên URL.",
      parameters: [uuidParam("patientId"), uuidParam("visitId")],
      responses: {
        "200": {
          description: "Recording của Visit.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecordingResponse" },
            },
          },
        },
        ...errors,
      },
    },
  },
  "/api/patients/{patientId}/recordings": {
    get: {
      tags: ["Recordings"],
      summary: "Danh sách recording của bệnh nhân",
      operationId: "listPatientRecordings",
      security: doctorSecurity,
      parameters: [
        uuidParam("patientId"),
        {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        "200": {
          description: "Danh sách recording mới nhất trước.",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedRecordingsResponse",
              },
            },
          },
        },
        ...errors,
      },
    },
  },
  "/api/recordings/{recordingId}/playback-url": {
    get: {
      tags: ["Recordings"],
      summary: "Cấp signed URL phát WAV",
      operationId: "createRecordingPlaybackUrl",
      security: doctorSecurity,
      description:
        "Chỉ recording uploaded; URL đọc private object hết hạn sau 600 giây và không được lưu DB.",
      parameters: [uuidParam("recordingId")],
      responses: {
        "200": {
          description: "Signed playback URL.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlaybackUrlResponse" },
            },
          },
        },
        ...errors,
      },
    },
  },
} satisfies Record<string, OpenApiPathItem>;
