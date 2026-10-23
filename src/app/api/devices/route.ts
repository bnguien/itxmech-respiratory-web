import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { deviceAssignments, wearableDevices } from "@/lib/db/schema/wearables";
import { apiError, authorizeDoctor } from "@/lib/patients/server";

/** Vòng đeo đã từng gửi dữ liệu, kèm bệnh nhân đang gán và lần cuối server nhận dữ liệu. */
export async function GET() {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  try {
    const rows = await db
      .select({
        device_id: wearableDevices.deviceId,
        battery_pct: wearableDevices.batteryPct,
        worn: wearableDevices.worn,
        last_seen_at: wearableDevices.lastSeenAt,
        transport: wearableDevices.transport,
        fw: wearableDevices.fw,
        applied_config_version: wearableDevices.appliedConfigVersion,
        patient_id: patients.id,
        patient_name: patients.fullName,
        patient_code: patients.patientCode,
      })
      .from(wearableDevices)
      .leftJoin(deviceAssignments, and(eq(deviceAssignments.deviceId, wearableDevices.deviceId), isNull(deviceAssignments.unassignedAt)))
      .leftJoin(patients, eq(patients.id, deviceAssignments.patientId))
      .orderBy(desc(wearableDevices.lastSeenAt));
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Unable to list devices", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải danh sách thiết bị.");
  }
}
