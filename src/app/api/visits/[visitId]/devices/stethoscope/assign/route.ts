import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visits } from "@/lib/db/schema/visits";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  apiError,
  internalVisitError,
  visitStateError,
} from "@/lib/visits/server";
import {
  assignStethoscopeVisit,
  GatewayError,
  STETHOSCOPE_DEVICE_ID,
} from "@/lib/visits/stethoscope-gateway";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ visitId: string }> };

export async function POST(_request: Request, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;

  const { visitId } = await params;
  if (!uuidPattern.test(visitId)) {
    return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
  }

  try {
    const [visit] = await db
      .select({ doctorId: visits.doctorId, status: visits.status })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);
    if (!visit) return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
    if (visit.doctorId !== auth.doctorId) {
      return apiError(
        403,
        "FORBIDDEN",
        "Chỉ bác sĩ phụ trách mới được gán thiết bị cho lần khám này.",
      );
    }
    if (visit.status !== "in_progress") return visitStateError(visit.status);

    await assignStethoscopeVisit(visitId);
    return NextResponse.json(
      {
        data: {
          device_id: STETHOSCOPE_DEVICE_ID,
          visit_id: visitId,
          status: "requested",
        },
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof GatewayError) {
      return apiError(error.status, error.code, error.message);
    }
    return internalVisitError("Failed to assign stethoscope visit", error);
  }
}
