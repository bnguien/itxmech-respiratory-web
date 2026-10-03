import type { OpenApiPathItem } from "../types";

const security = [{ bearerAuth: [] }];
const patientId = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const visitId = { name: "visitId", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const commonErrors = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
  "404": { $ref: "#/components/responses/NotFound" },
  "409": { $ref: "#/components/responses/Conflict" },
  "500": { $ref: "#/components/responses/InternalError" },
};

export const visitPaths = {
  "/api/patients/{id}/visits": {
    get: {
      tags: ["Visits"],
      summary: "Lịch sử khám của bệnh nhân",
      description: "Mọi bác sĩ đã đăng nhập đều có thể xem. Kết quả sắp xếp theo started_at mới nhất trước.",
      operationId: "listPatientVisits",
      security,
      parameters: [
        patientId,
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        "200": { description: "Danh sách lần khám.", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedVisitsResponse" } } } },
        ...commonErrors,
      },
    },
    post: {
      tags: ["Visits"],
      summary: "Tạo lần khám mới",
      description: "Máy chủ tự gán patient_id, doctor_id, trạng thái in_progress, version 1 và started_at. Không cho tạo trên bệnh nhân đã lưu trữ.",
      operationId: "createVisit",
      security,
      parameters: [patientId],
      responses: {
        "201": { description: "Đã tạo lần khám.", content: { "application/json": { schema: { $ref: "#/components/schemas/VisitResponse" } } } },
        ...commonErrors,
      },
    },
  },
  "/api/patients/{id}/visits/{visitId}": {
    get: {
      tags: ["Visits"],
      summary: "Chi tiết lần khám",
      description: "Mọi bác sĩ đã đăng nhập đều có thể xem. Visit phải thuộc patient trên URL.",
      operationId: "getVisit",
      security,
      parameters: [patientId, visitId],
      responses: {
        "200": { description: "Chi tiết lần khám.", content: { "application/json": { schema: { $ref: "#/components/schemas/VisitResponse" } } } },
        ...commonErrors,
      },
    },
    patch: {
      tags: ["Visits"],
      summary: "Lưu ghi chú lần khám",
      description: "Chỉ bác sĩ phụ trách được sửa visit in_progress. Version được dùng cho optimistic locking và tăng một sau khi lưu.",
      operationId: "updateVisit",
      security,
      parameters: [patientId, visitId],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VisitUpdate" } } } },
      responses: {
        "200": { description: "Đã lưu lần khám.", content: { "application/json": { schema: { $ref: "#/components/schemas/VisitResponse" } } } },
        ...commonErrors,
      },
    },
    delete: {
      tags: ["Visits"],
      summary: "Xóa lần khám đã hủy",
      description: "Chỉ bác sĩ phụ trách được xóa vĩnh viễn Visit ở trạng thái cancelled. Yêu cầu version hiện tại để chống xung đột.",
      operationId: "deleteCancelledVisit",
      security,
      parameters: [patientId, visitId],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VisitVersion" } } } },
      responses: {
        "200": { description: "Đã xóa lần khám.", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
        ...commonErrors,
      },
    },
  },
  "/api/patients/{id}/visits/{visitId}/complete": {
    post: {
      tags: ["Visits"],
      summary: "Hoàn tất lần khám",
      description: "Chỉ owner có thể chuyển in_progress sang completed. Yêu cầu version hiện tại; completed trở thành chỉ đọc.",
      operationId: "completeVisit",
      security,
      parameters: [patientId, visitId],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VisitVersion" } } } },
      responses: {
        "200": { description: "Đã hoàn tất lần khám.", content: { "application/json": { schema: { type: "object" } } } },
        ...commonErrors,
      },
    },
  },
  "/api/patients/{id}/visits/{visitId}/cancel": {
    post: {
      tags: ["Visits"],
      summary: "Hủy lần khám",
      description: "Chỉ owner có thể chuyển in_progress sang cancelled. Yêu cầu version hiện tại; cancelled vẫn được giữ trong lịch sử và chỉ đọc.",
      operationId: "cancelVisit",
      security,
      parameters: [patientId, visitId],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VisitVersion" } } } },
      responses: {
        "200": { description: "Đã hủy lần khám.", content: { "application/json": { schema: { type: "object" } } } },
        ...commonErrors,
      },
    },
  },
} satisfies Record<string, OpenApiPathItem>;
