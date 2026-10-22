// config.v1 mặc định khi bác sĩ chưa đặt ngưỡng (version 0 = "ngưỡng xuất xưởng"), khớp spo2tc_config_default()
// trên firmware (SPO2-RESEARCH/respiratory-risk-classifier/firmware/docs/CONFIG_VA_API.md §4.4).

export const CURRENT_MODEL_VERSION = "hybrid_tc-20261016-s3";

export function defaultConfig(deviceId: string | null, assignmentId: number | null, appliedOnDevice: boolean) {
  return {
    schema: "config.v1",
    device_id: deviceId,
    assignment_id: assignmentId,
    version: 0,
    preset: "default",
    model_version: CURRENT_MODEL_VERSION,
    T: 88,
    ml_enabled: true,
    thr_q: { watch: 71, alert: 86 },
    tiers: { watch: { k: 1, n: 1, cooldown: 30 }, alert: { k: 1, n: 1, cooldown: 60 } },
    critical: { crit_T: 85, n_min: 3, sqi_min: 0.5, hr_low: 40, hr_high: 140, cooldown: 30 },
    uplink: { upload_interval_min: 10 },
    set_by: null,
    updated_at: null,
    applied_on_device: appliedOnDevice,
  };
}
