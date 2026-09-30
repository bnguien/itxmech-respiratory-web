import type { OpenApiPathItem } from "../types";

export const authPaths = {
  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Lấy phiên đăng nhập và hồ sơ bác sĩ hiện tại",
      description:
        "Route Handler được bảo vệ của RespiCare. Ứng dụng web xác thực bằng Supabase SSR session cookie. Bearer JWT được khai báo cho các API client sử dụng Supabase access token khi backend hỗ trợ cơ chế này. Các thao tác đăng nhập, đăng xuất và mật khẩu vẫn được thực hiện trực tiếp qua Supabase SDK, không có REST wrapper riêng.",
      operationId: "getCurrentDoctor",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Thông tin bác sĩ đang đăng nhập.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CurrentDoctorResponse" },
            },
          },
        },
        "401": {
          description: "Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRouteErrorResponse" },
            },
          },
        },
      },
    },
  },
} satisfies Record<string, OpenApiPathItem>;
