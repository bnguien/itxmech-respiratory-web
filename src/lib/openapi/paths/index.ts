import { authPaths } from "./auth";
import { systemPaths } from "./system";
import type { OpenApiPathItem } from "../types";

// Add each domain path map here as the backend grows. Keeping this merge in one
// place prevents the route handlers and OpenAPI document from becoming coupled.
export const openApiPaths: Record<string, OpenApiPathItem> = {
  ...authPaths,
  ...systemPaths,
};
