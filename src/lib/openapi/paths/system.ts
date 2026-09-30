import type { OpenApiPathItem } from "../types";

export const systemPaths = {
  "/api/health": {
    get: {
      tags: ["System"],
      summary: "Kiểm tra trạng thái dịch vụ",
      description:
        "Endpoint công khai dùng để xác nhận Next.js backend đang hoạt động.",
      operationId: "getHealth",
      security: [],
      responses: {
        "200": {
          description: "Dịch vụ đang hoạt động.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HealthResponse" },
              example: { status: "ok" },
            },
          },
        },
      },
    },
  },
} satisfies Record<string, OpenApiPathItem>;
