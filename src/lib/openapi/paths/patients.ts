import type { OpenApiPathItem } from "../types";

const security = [{ bearerAuth: [] }];
const errors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
  "500": { $ref: "#/components/responses/InternalError" },
};
const patientId = {
  name: "id",
  in: "path",
  required: true,
  description: "UUID của bệnh nhân.",
  schema: { type: "string", format: "uuid" },
};

export const patientPaths = {
  "/api/patients": {
    get: {
      tags: ["Patients"],
      summary: "Danh sách và tìm kiếm bệnh nhân",
      operationId: "listPatients",
      security,
      parameters: [
        {
          name: "q",
          in: "query",
          schema: { type: "string" },
          description: "Tìm theo họ tên, mã bệnh nhân hoặc số điện thoại.",
        },
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
          description: "Danh sách bệnh nhân đang hoạt động (chưa lưu trữ).",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientListResponse" },
            },
          },
        },
        ...errors,
      },
    },
    post: {
      tags: ["Patients"],
      summary: "Tạo hồ sơ bệnh nhân",
      description:
        "Mã bệnh nhân và bác sĩ tạo được gán ở máy chủ; patient_code do PostgreSQL sequence sinh.",
      operationId: "createPatient",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PatientInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Đã tạo hồ sơ.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientResponse" },
            },
          },
        },
        ...errors,
      },
    },
  },
  "/api/patients/{id}": {
    get: {
      tags: ["Patients"],
      summary: "Chi tiết bệnh nhân",
      operationId: "getPatient",
      security,
      parameters: [patientId],
      responses: {
        "200": {
          description: "Hồ sơ bệnh nhân, bao gồm cả hồ sơ đã lưu trữ ở chế độ chỉ xem.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientResponse" },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
        ...errors,
      },
    },
    patch: {
      tags: ["Patients"],
      summary: "Cập nhật bệnh nhân",
      description:
        "Chỉ cho phép cập nhật họ tên, ngày sinh, giới tính, số điện thoại, triệu chứng ban đầu và chẩn đoán nền.",
      operationId: "updatePatient",
      security,
      parameters: [patientId],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PatientUpdate" },
          },
        },
      },
      responses: {
        "200": {
          description: "Hồ sơ đã cập nhật.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatientResponse" },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
        ...errors,
      },
    },
  },
  "/api/patients/archive": {
    get: {
      tags: ["Patients"],
      summary: "Danh sách bệnh nhân đã lưu trữ",
      operationId: "listArchivedPatients",
      security,
      parameters: [
        { name: "q", in: "query", schema: { type: "string" }, description: "Tìm theo họ tên, mã bệnh nhân hoặc số điện thoại." },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        "200": { description: "Danh sách hồ sơ đã lưu trữ.", content: { "application/json": { schema: { $ref: "#/components/schemas/PatientListResponse" } } } },
        ...errors,
      },
    },
  },
  "/api/patients/{id}/archive": {
    post: {
      tags: ["Patients"],
      summary: "Lưu trữ hồ sơ bệnh nhân",
      description:
        "Không xóa vật lý. API đặt archived_at và archived_by theo bác sĩ đang đăng nhập; hồ sơ sau đó không còn xuất hiện trong danh sách hoạt động.",
      operationId: "archivePatient",
      security,
      parameters: [patientId],
      responses: {
        "200": {
          description: "Đã lưu trữ hồ sơ.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessResponse" },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "500": { $ref: "#/components/responses/InternalError" },
      },
    },
  },
  "/api/patients/{id}/restore": {
    post: {
      tags: ["Patients"],
      summary: "Khôi phục bệnh nhân",
      description: "Xóa archived_at và archived_by để đưa hồ sơ trở lại danh sách hoạt động.",
      operationId: "restorePatient",
      security,
      parameters: [patientId],
      responses: {
        "200": { description: "Đã khôi phục hồ sơ.", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
        "404": { $ref: "#/components/responses/NotFound" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "500": { $ref: "#/components/responses/InternalError" },
      },
    },
  },
} satisfies Record<string, OpenApiPathItem>;
