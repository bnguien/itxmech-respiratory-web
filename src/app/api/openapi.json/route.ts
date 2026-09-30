import { openApiDocument } from "@/lib/openapi/document";

export const dynamic = "force-static";

export function GET() {
  return Response.json(openApiDocument, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
