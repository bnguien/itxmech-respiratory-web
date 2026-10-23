"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Printer, Smartphone } from "lucide-react";
import { shareText, SHEET_STEPS } from "@/lib/app-access/sheet";
import type { AppAccessCredentials } from "@/types/patient";

/**
 * Thông tin đăng nhập app người nhà: hiện ngay sau khi tạo hồ sơ, khi cấp mã mới, hoặc khi bác sĩ mở lại từ hồ sơ.
 * Mã được lưu (mã hóa) nên xem và in lại phiếu A5 được bất cứ lúc nào.
 */
export function AppAccessModal({
  patientId,
  patientName,
  credentials,
  rotated = false,
  onClose,
}: {
  patientId: string;
  patientName: string;
  credentials: AppAccessCredentials;
  rotated?: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "access" | "all" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy(text: string, which: "code" | "access" | "all") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="app-access-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#E7F1FB] p-3 text-[#2F78C8]">
            <Smartphone size={22} />
          </span>
          <div>
            <h2 id="app-access-title" className="text-lg font-extrabold text-[#173A5E]">
              {rotated ? "Đã cấp mã truy cập mới" : "Thông tin đăng nhập app cho người nhà"}
            </h2>
            <p className="mt-1 text-sm text-[#5A7799]">
              Bệnh nhân <b>{patientName}</b>
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-3">
          <CredentialRow label="Mã bệnh nhân" value={credentials.patient_code} copied={copied === "code"} onCopy={() => void copy(credentials.patient_code, "code")} />
          <CredentialRow label="Mã truy cập" value={credentials.access_code} copied={copied === "access"} onCopy={() => void copy(credentials.access_code, "access")} emphasize />
        </dl>

        <div className="mt-4 rounded-2xl bg-[#F4F8FD] p-4 text-xs leading-relaxed text-[#5A7799]">
          <p className="flex items-center gap-1.5 font-bold text-[#173A5E]">
            <KeyRound size={14} /> Hướng dẫn người nhà
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            {SHEET_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="mt-3 text-[#173A5E]">
            Phiếu được lưu trong hồ sơ bệnh nhân, mở lại và in lại được bất cứ lúc nào.
            {rotated ? " Các máy đang đăng nhập vẫn dùng bình thường; lần đăng nhập mới dùng mã này." : ""}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => void copy(shareText(patientName, credentials), "all")} className="btn-secondary">
            {copied === "all" ? <Check size={15} /> : <Copy size={15} />}
            {copied === "all" ? "Đã sao chép" : "Sao chép tin nhắn"}
          </button>
          <a href={`/print/app-access/${patientId}`} target="_blank" rel="noopener" className="btn-secondary">
            <Printer size={15} />
            In phiếu A5 / PDF
          </a>
          <button type="button" onClick={onClose} className="btn-primary">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  emphasize = false,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#E7F1FB] px-4 py-3">
      <div>
        <dt className="text-[11px] font-bold uppercase tracking-wider text-[#5A7799]">{label}</dt>
        <dd className={`mt-0.5 font-mono font-extrabold text-[#173A5E] ${emphasize ? "text-2xl tracking-[0.3em]" : "text-lg"}`}>{value}</dd>
      </div>
      <button type="button" onClick={onCopy} aria-label={`Sao chép ${label.toLowerCase()}`} className="rounded-lg p-2 text-[#2F78C8] hover:bg-[#F4F8FD]">
        {copied ? <Check size={17} /> : <Copy size={17} />}
      </button>
    </div>
  );
}
