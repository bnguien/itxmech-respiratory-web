import type { OpenApiResponse, OpenApiSchema } from "./types";

export const openApiSchemas = {
  Patient: {
    type: "object",
    required: ["id", "patient_code", "full_name", "date_of_birth", "gender", "created_by", "created_at", "updated_at"],
    properties: {
      id: { type: "string", format: "uuid" },
      patient_code: { type: "string", example: "PAT-000001", readOnly: true },
      full_name: { type: "string", example: "Nguyễn Văn An" },
      date_of_birth: { type: "string", format: "date", example: "1980-05-20" },
      gender: { type: "string", enum: ["male", "female", "other"] },
      phone: { type: "string", nullable: true, example: "0901234567" },
      background_diagnosis: { type: "string", nullable: true, example: "COPD" },
      created_by: { type: "string", format: "uuid", readOnly: true },
      created_at: { type: "string", format: "date-time", readOnly: true },
      updated_at: { type: "string", format: "date-time", readOnly: true },
    },
  },
  PatientInput: {
    type: "object",
    required: ["full_name", "date_of_birth", "gender"],
    additionalProperties: false,
    properties: {
      full_name: { type: "string" },
      date_of_birth: { type: "string", format: "date" },
      gender: { type: "string", enum: ["male", "female", "other"] },
      phone: { type: "string", nullable: true },
      background_diagnosis: { type: "string", nullable: true },
    },
  },
  PatientUpdate: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      full_name: { type: "string" },
      date_of_birth: { type: "string", format: "date" },
      gender: { type: "string", enum: ["male", "female", "other"] },
      phone: { type: "string", nullable: true },
      background_diagnosis: { type: "string", nullable: true },
    },
  },
  PatientResponse: { type: "object", required: ["data"], properties: { data: { $ref: "#/components/schemas/Patient" } } },
  PatientListResponse: {
    type: "object", required: ["data", "pagination"], properties: {
      data: { type: "array", items: { $ref: "#/components/schemas/Patient" } },
      pagination: { type: "object", required: ["page", "limit", "total", "total_pages"], properties: { page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, total_pages: { type: "integer" } } },
    },
  },
  DoctorProfile: {
    type: "object",
    required: [
      "id",
      "full_name",
      "professional_title",
      "specialty",
      "department",
      "avatar_url",
      "created_at",
      "updated_at",
    ],
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "f4bcf663-5084-4ed0-a6ae-38fcd9879d94",
      },
      full_name: { type: "string", example: "BS. Nguyễn Văn A" },
      professional_title: {
        type: "string",
        nullable: true,
        example: "Bác sĩ chuyên khoa II",
      },
      specialty: {
        type: "string",
        nullable: true,
        example: "Hô hấp",
      },
      department: {
        type: "string",
        nullable: true,
        example: "Khoa Hô hấp",
      },
      avatar_url: {
        type: "string",
        format: "uri",
        nullable: true,
        example: "https://example.com/avatars/doctor-a.png",
      },
      created_at: {
        type: "string",
        format: "date-time",
        example: "2026-09-30T08:00:00.000Z",
      },
      updated_at: {
        type: "string",
        format: "date-time",
        example: "2026-09-30T08:00:00.000Z",
      },
    },
  },
  AuthenticatedDoctor: {
    type: "object",
    required: ["email", "profile"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "doctor@example.com",
      },
      profile: {
        nullable: true,
        allOf: [{ $ref: "#/components/schemas/DoctorProfile" }],
      },
    },
  },
  CurrentDoctorResponse: {
    type: "object",
    required: ["doctor"],
    properties: {
      doctor: { $ref: "#/components/schemas/AuthenticatedDoctor" },
    },
  },
  AuthRouteErrorResponse: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "string",
        example: "Bạn cần đăng nhập để thực hiện yêu cầu này.",
      },
    },
  },
  ErrorResponse: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "string",
            example: "INTERNAL_ERROR",
          },
          message: {
            type: "string",
            example: "Đã xảy ra lỗi. Vui lòng thử lại.",
          },
        },
      },
    },
  },
  ValidationError: {
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message", "details"],
        properties: {
          code: {
            type: "string",
            enum: ["VALIDATION_ERROR"],
            example: "VALIDATION_ERROR",
          },
          message: {
            type: "string",
            example: "Dữ liệu gửi lên không hợp lệ.",
          },
          details: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "message"],
              properties: {
                field: { type: "string", example: "fullName" },
                message: {
                  type: "string",
                  example: "Vui lòng nhập họ và tên.",
                },
              },
            },
          },
        },
      },
    },
  },
  UnauthorizedError: {
    allOf: [{ $ref: "#/components/schemas/ErrorResponse" }],
    example: {
      error: {
        code: "UNAUTHORIZED",
        message: "Bạn chưa đăng nhập.",
      },
    },
  },
  ForbiddenError: {
    allOf: [{ $ref: "#/components/schemas/ErrorResponse" }],
    example: {
      error: {
        code: "FORBIDDEN",
        message: "Bạn không có quyền thực hiện thao tác này.",
      },
    },
  },
  NotFoundError: {
    allOf: [{ $ref: "#/components/schemas/ErrorResponse" }],
    example: {
      error: {
        code: "NOT_FOUND",
        message: "Không tìm thấy tài nguyên được yêu cầu.",
      },
    },
  },
  SuccessResponse: {
    type: "object",
    required: ["success"],
    properties: {
      success: { type: "boolean", example: true },
      message: {
        type: "string",
        example: "Thao tác thành công.",
      },
      data: {
        nullable: true,
        description: "Dữ liệu trả về của thao tác, nếu có.",
      },
    },
  },
  HealthResponse: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["ok"],
        example: "ok",
      },
    },
  },
} satisfies Record<string, OpenApiSchema>;

function jsonResponse(schemaName: keyof typeof openApiSchemas): OpenApiResponse {
  return {
    description: "Yêu cầu không thành công.",
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  };
}

export const commonOpenApiResponses = {
  ValidationError: {
    ...jsonResponse("ValidationError"),
    description: "Dữ liệu yêu cầu không hợp lệ.",
  },
  Unauthorized: {
    ...jsonResponse("UnauthorizedError"),
    description: "Chưa xác thực hoặc phiên đăng nhập không hợp lệ.",
  },
  Forbidden: {
    ...jsonResponse("ForbiddenError"),
    description: "Người dùng không có quyền truy cập tài nguyên.",
  },
  NotFound: {
    ...jsonResponse("NotFoundError"),
    description: "Không tìm thấy tài nguyên.",
  },
  InternalError: {
    ...jsonResponse("ErrorResponse"),
    description: "Lỗi máy chủ nội bộ.",
  },
} satisfies Record<string, OpenApiResponse>;
