"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Printer, RefreshCw } from "lucide-react";
import { AppAccessModal } from "@/components/patients/app-access-modal";
import type { AppAccessCredentials, PatientAppAccessStatus } from "@/types/patient";

/**
 * Thẻ trong hồ sơ bệnh nhân: phiếu đăng nhập app người nhà luôn xem / in lại được.
 * "Cấp mã mới" chỉ dùng khi mã bị lộ; các máy đang đăng nhập không bị đăng xuất.
 */
export function PatientAppAccessCard({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [status, setStatus] = useState<PatientAppAccessStatus | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [shown, setShown] = useState<{ credentials: AppAccessCredentials; rotated: boolean } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/patients/${patientId}/app-access`, { cache: "no-store" });
    const payload = (await response.json()) as { data?: PatientAppAccessStatus; error?: { message?: string } };
    if (!response.ok || !payload.data) setError(payload.error?.message || "Không thể tải thông tin đăng nhập app.");
    else setStatus(payload.data);
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function rotate() {
    setRotating(true);
    setError("");
    try {
      const response = await fetch(`/api/patients/${patientId}/app-access`, { method: "POST" });
      const payload = (await response.json()) as { data?: AppAccessCredentials; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Không thể cấp mã truy cập mới.");
      setShown({ credentials: payload.data, rotated: true });
      setConfirming(false);
      void load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cấp mã truy cập mới.");
    } finally {
      setRotating(false);
    }
  }

  const code = status?.access_code ?? null;

  return (
    <div className="page w-full !pt-0">
      <section className="card p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#E7F1FB] p-2.5 text-[#2F78C8]">
              <KeyRound size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#173A5E]">Phiếu đăng nhập app người nhà</h3>
              <p className="text-xs text-[#5A7799]">
                {status
                  ? `Mã bệnh nhân ${status.patient_code} · ${
                      code ? `mã truy cập ${code}` : status.has_access_code ? "mã cũ chưa lưu phiếu, cần cấp mã mới để in" : "chưa có mã truy cập"
                    } · ${status.active_sessions} máy đang đăng nhập`
                  : "Đang tải..."}
              </p>
            </div>
          </div>
          {!confirming ? (
            <div className="flex flex-wrap gap-2 self-start">
              {status && code && (
                <button
                  type="button"
                  onClick={() => setShown({ credentials: { patient_code: status.patient_code, access_code: code }, rotated: false })}
                  className="btn-primary"
                >
                  <Printer size={15} />
                  Xem / in phiếu
                </button>
              )}
              <button type="button" onClick={() => setConfirming(true)} className="btn-secondary">
                <RefreshCw size={15} />
                Cấp mã mới
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 self-start">
              <span className="text-xs text-[#5A7799]">Mã cũ không đăng nhập mới được nữa; máy đang dùng vẫn giữ đăng nhập.</span>
              <button type="button" onClick={() => setConfirming(false)} disabled={rotating} className="btn-secondary">
                Hủy
              </button>
              <button type="button" onClick={() => void rotate()} disabled={rotating} className="btn-primary">
                {rotating ? "Đang cấp..." : "Cấp mã mới"}
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
      {shown && (
        <AppAccessModal
          patientId={patientId}
          patientName={patientName}
          credentials={shown.credentials}
          rotated={shown.rotated}
          onClose={() => setShown(null)}
        />
      )}
    </div>
  );
}
