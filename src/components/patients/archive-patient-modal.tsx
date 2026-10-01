"use client";

import { useEffect } from "react";
import { Archive, X } from "lucide-react";

export function ArchivePatientModal({
  patientName,
  isArchiving = false,
  onClose,
  onConfirm,
}: {
  patientName: string;
  isArchiving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isArchiving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isArchiving, onClose]);

  return (
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isArchiving) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="archive-patient-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#E7F1FB] p-3 text-[#2F78C8]"><Archive size={22} /></span>
            <div>
              <h2 id="archive-patient-title" className="text-lg font-extrabold text-[#173A5E]">Lưu trữ hồ sơ bệnh nhân?</h2>
              <p className="mt-1 text-sm text-[#5A7799]">Hồ sơ của <b>{patientName}</b> sẽ được chuyển vào danh sách lưu trữ.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isArchiving} aria-label="Đóng" className="rounded-lg p-1.5 text-[#5A7799] hover:bg-[#F4F8FD] disabled:opacity-50"><X size={18} /></button>
        </div>
        <p className="mt-5 text-sm text-[#5A7799]">Dữ liệu không bị xóa và có thể được khôi phục bất kỳ lúc nào từ danh sách lưu trữ.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isArchiving} className="btn-secondary">Hủy</button>
          <button type="button" onClick={onConfirm} disabled={isArchiving} className="btn-primary">{isArchiving ? "Đang lưu trữ..." : "Lưu trữ hồ sơ"}</button>
        </div>
      </div>
    </div>
  );
}
