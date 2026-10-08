import { openApiPaths } from "./paths";
import { commonOpenApiResponses, openApiSchemas } from "./schemas";
import type { OpenApiDocument } from "./types";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ITxMech RespiCare API",
    description:
      "Backend API for ITxMech RespiCare, including authentication-related endpoints, patient management, visits, SpO₂ monitoring, lung sound recordings, AI analysis workflow, doctor review, alerts, and devices.\n\nAuthentication is provided by Supabase Auth. Login, logout, password recovery, password reset, and password changes are performed directly through the Supabase SDK and are not duplicated as custom REST endpoints.",
    version: "0.1.0",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
    {
      url: "https://your-production-domain.example",
      description: "Production placeholder — replace with the deployed domain",
    },
  ],
  tags: [
    {
      name: "Auth",
      description:
        "Authenticated session APIs exposed by the Next.js backend. Login, logout, and password flows use the Supabase SDK directly.",
    },
    { name: "Doctors", description: "Authenticated doctor profile APIs." },
    { name: "Patients", description: "Patient management APIs." },
    { name: "Visits", description: "Clinical visit workflow APIs." },
    { name: "SpO2", description: "Blood oxygen monitoring APIs." },
    { name: "Recordings", description: "Lung sound recording APIs." },
    {
      name: "Respiratory Cycles",
      description: "Respiratory cycle analysis and review APIs.",
    },
    { name: "Alerts", description: "Clinical alert APIs." },
    { name: "Devices", description: "Connected medical device APIs." },
    { name: "System", description: "Backend status and operational APIs." },
  ],
  paths: openApiPaths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Supabase Auth access token. Use example values only in shared documentation.",
      },
      deviceKey: {
        type: "apiKey",
        in: "header",
        name: "X-Device-Key",
        description: "Firmware device credential. Never place a real key in shared documentation.",
      },
    },
    schemas: openApiSchemas,
    responses: commonOpenApiResponses,
  },
} satisfies OpenApiDocument;
