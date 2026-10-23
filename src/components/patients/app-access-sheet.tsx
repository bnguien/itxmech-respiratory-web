"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { loginUri, SHEET_STEPS } from "@/lib/app-access/sheet";
import type { PatientAppAccessStatus } from "@/types/patient";

const dateFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Phiếu đăng nhập app khổ A5, bố cục giống popup, thêm mã QR. Bấm "In / Lưu PDF" rồi chọn máy in
 * hoặc "Lưu dưới dạng PDF" trong hộp thoại in của trình duyệt (khổ A5 đã đặt sẵn bằng @page).
 */
export function AppAccessSheet({ patientId }: { patientId: string }) {
  const [status, setStatus] = useState<PatientAppAccessStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch(`/api/patients/${patientId}/app-access`, { cache: "no-store" });
      const body = (await response.json()) as { data?: PatientAppAccessStatus; error?: { message?: string } };
      if (!active) return;
      if (!response.ok || !body.data) {
        setError(body.error?.message || "Không thể tải phiếu đăng nhập. Hãy đăng nhập web bác sĩ.");
        return;
      }
      if (!body.data.access_code) {
        setError("Mã truy cập hiện tại được cấp trước khi phiếu được lưu. Vào hồ sơ bệnh nhân, bấm \"Cấp mã mới\" rồi in lại.");
        return;
      }
      setStatus(body.data);
      const uri = loginUri({ patient_code: body.data.patient_code, access_code: body.data.access_code });
      setQr(await QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 1, width: 360 }));
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!status || !qr) return <p className="p-8 text-sm text-[#5A7799]">Đang tạo phiếu…</p>;

  return (
    <div className="min-h-screen bg-[#EEF3F9] py-8 print:bg-white print:py-0">
      <style>{`@page { size: A5 portrait; margin: 10mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[148mm] justify-end">
        <button type="button" onClick={() => window.print()} className="btn-primary">
          <Printer size={15} /> In / Lưu PDF
        </button>
      </div>
      <article className="mx-auto box-border w-[148mm] rounded-2xl bg-white p-[10mm] text-[#173A5E] shadow-xl print:w-auto print:rounded-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-[#DDE8F4] pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2F78C8]">RespiCare · ITxMECH</p>
            <h1 className="mt-1 text-lg font-extrabold">Phiếu đăng nhập app người nhà</h1>
          </div>
          <p className="text-right text-[10px] text-[#5A7799]">
            Ngày in {dateFormat.format(new Date())}
            {status.rotated_at ? <><br />Mã cấp {dateFormat.format(new Date(status.rotated_at))}</> : null}
          </p>
        </header>

        <p className="mt-4 text-sm">
          Bệnh nhân: <b>{status.full_name}</b>
        </p>

        <section className="mt-4 grid grid-cols-[1fr_auto] items-center gap-5">
          <dl className="space-y-3">
            <div className="rounded-xl border border-[#DDE8F4] px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#5A7799]">Mã bệnh nhân</dt>
              <dd className="mt-0.5 font-mono text-xl font-extrabold">{status.patient_code}</dd>
            </div>
            <div className="rounded-xl border border-[#DDE8F4] px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#5A7799]">Mã truy cập</dt>
              <dd className="mt-0.5 font-mono text-2xl font-extrabold tracking-[0.3em]">{status.access_code}</dd>
            </div>
          </dl>
          <figure className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh data URL tạo tại chỗ, cần in đúng kích thước */}
            <img src={qr} alt="Mã QR đăng nhập app RespiCare" className="h-[42mm] w-[42mm]" />
            <figcaption className="mt-1 text-[10px] text-[#5A7799]">Quét bằng app RespiCare</figcaption>
          </figure>
        </section>

        <section className="mt-5 rounded-xl bg-[#F4F8FD] p-4 text-xs leading-relaxed print:bg-[#F4F8FD]">
          <p className="font-bold">Hướng dẫn</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            {SHEET_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <footer className="mt-4 border-t border-[#DDE8F4] pt-3 text-[10px] leading-relaxed text-[#5A7799]">
          Giữ kín phiếu này: ai có mã (hoặc ảnh mã QR) đều xem được dữ liệu SpO₂ của bệnh nhân.
          Mất phiếu hoặc lộ mã, liên hệ bác sĩ để cấp mã mới. App chỉ hỗ trợ theo dõi, không thay thế chẩn đoán của bác sĩ.
        </footer>
      </article>
    </div>
  );
}
