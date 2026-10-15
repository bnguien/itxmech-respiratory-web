import "server-only";

export const STETHOSCOPE_DEVICE_ID = "RESPICARE-STETH-001";

export class GatewayError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function assignStethoscopeVisit(visitId: string): Promise<void> {
  const base = process.env.MQTT_GATEWAY_URL;
  const key = process.env.MQTT_GATEWAY_API_KEY;
  if (!base || !key) {
    throw new GatewayError(
      503,
      "GATEWAY_NOT_CONFIGURED",
      "MQTT Gateway chưa được cấu hình.",
    );
  }

  let url: URL;
  try {
    url = new URL(`${base.replace(/\/+$/, "")}/api/v1/commands/assign-visit`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new GatewayError(
      503,
      "GATEWAY_NOT_CONFIGURED",
      "MQTT Gateway chưa được cấu hình hợp lệ.",
    );
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Key": key,
      },
      body: JSON.stringify({
        device_id: STETHOSCOPE_DEVICE_ID,
        visit_id: visitId,
      }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) {
      throw new GatewayError(
        502,
        "GATEWAY_ERROR",
        "MQTT Gateway không chấp nhận lệnh gán lần khám.",
      );
    }
  } catch (error) {
    if (error instanceof GatewayError) throw error;
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    ) {
      throw new GatewayError(
        504,
        "GATEWAY_TIMEOUT",
        "MQTT Gateway phản hồi quá thời gian chờ.",
      );
    }
    throw new GatewayError(
      502,
      "GATEWAY_UNAVAILABLE",
      "Không thể kết nối MQTT Gateway.",
    );
  }
}
