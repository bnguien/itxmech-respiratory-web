"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { AppAccessModal } from "@/components/patients/app-access-modal";
import type { AppAccessCredentials, PatientAppAccessStatus } from "@/types/patient";

/** Thẻ trong hồ sơ bệnh nhân: trạng thái đăng nhập app người nhà và nút cấp lại mã. */
export function PatientAppAccessCard({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [status, setStatus] = useState<PatientAppAccessStatus | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [issued, setIssued] = useState<AppAccessCredentials | null>(null);

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
      setIssued(payload.data);
      setConfirming(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cấp mã truy cập mới.");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="page w-full !pt-0">
      <section className="card p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#E7F1FB] p-2.5 text-[#2F78C8]">
              <KeyRound size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#173A5E]">Đăng nhập app người nhà</h3>
              <p className="text-xs text-[#5A7799]">
                {status
                  ? `Mã bệnh nhân ${status.patient_code} · ${
                      status.has_access_code ? "đã cấp mã truy cập" : "chưa có mã truy cập"
                    } · ${status.active_sessions} máy đang đăng nhập`
                  : "Đang tải..."}
              </p>
            </div>
          </div>
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className="btn-secondary self-start">
              <RefreshCw size={15} />
              {status?.has_access_code ? "Cấp lại mã truy cập" : "Cấp mã truy cập"}
            </button>
          ) : (
            <div className="flex items-center gap-2 self-start">
              <span className="text-xs text-[#B45309]">Mã cũ hết hiệu lực, các máy phải đăng nhập lại.</span>
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
      {issued && (
        <AppAccessModal
          patientName={patientName}
          credentials={issued}
          rotated
          onClose={() => {
            setIssued(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
