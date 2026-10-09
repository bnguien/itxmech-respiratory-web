"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecordingCatalogItem } from "@/types/recording-catalog";

export function RecordingPatientHeader({ recordingId }: { recordingId: string }) {
  const [patient, setPatient] = useState<RecordingCatalogItem | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/recordings?id=${encodeURIComponent(recordingId)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!result.data[0]) throw new Error();
        if (!controller.signal.aborted) { setPatient(result.data[0]); setError(false); }
      } catch { if (!controller.signal.aborted) setError(true); }
    }
    void load();
    return () => controller.abort();
  }, [recordingId, retry]);
  if (error) return <div role="alert" className="card p-5 text-sm text-red-700">Không thể tải thông tin bệnh nhân.<button className="btn-secondary ml-3" onClick={() => setRetry((value) => value + 1)}>Tải lại thông tin</button></div>;
  if (!patient) return <div className="card p-5 text-sm text-[#5A7799]">Đang tải thông tin bệnh nhân…</div>;
  return <section aria-label="Thông tin bệnh nhân" className="card flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
    <div>
      <p className="eyebrow">Bệnh nhân · {patient.patient_code}</p>
      <h2 className="mt-2 text-xl font-extrabold text-[#173A5E]">{patient.patient_name}</h2>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#5A7799]">
        <span>Ngày sinh: {patient.date_of_birth.split("-").reverse().join("/")}</span>
        <span>Giới tính: {({ male: "Nam", female: "Nữ", other: "Khác" })[patient.gender] ?? "—"}</span>
        <span>Điện thoại: {patient.phone ?? "—"}</span>
      </div>
      <p className="mt-3 text-sm text-[#5A7799]">Lần khám: {new Date(patient.visit_started_at).toLocaleString("vi-VN")}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Link className="btn-secondary" href={`/patients/${patient.patient_id}`}>Hồ sơ bệnh nhân</Link>
      <Link className="btn-secondary" href={`/patients/${patient.patient_id}/visits/${patient.visit_id}`}>Chi tiết lần khám</Link>
    </div>
  </section>;
}
