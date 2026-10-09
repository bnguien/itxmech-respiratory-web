"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { CycleLabelBadge } from "@/components/ui/status-badge";
import type { RecordingCatalogResponse } from "@/types/recording-catalog";

export function RecordingsList() {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<RecordingCatalogResponse | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/recordings?page=${page}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Không thể tải danh sách âm phổi.");
        const data = await response.json();
        if (!controller.signal.aborted) { setResult(data); setError(""); }
      } catch { if (!controller.signal.aborted) setError("Không thể tải danh sách âm phổi. Vui lòng thử lại."); }
    }
    void load();
    return () => controller.abort();
  }, [page, refresh]);
  const loading = !error && (!result || result.pagination.page !== page);
  return (
    <div className="page w-full space-y-6">
      <PageHeader title="Phân tích âm phổi" description="Danh sách bản ghi âm phổi của bệnh nhân" />
      {error && <div role="alert" className="card p-5 text-red-700">{error}<button className="btn-secondary ml-4" onClick={() => { setError(""); setRefresh((value) => value + 1); }}>Thử lại</button></div>}
      {loading && <p role="status" className="card p-8">Đang tải danh sách âm phổi…</p>}
      {!loading && !error && result && <>
        <p className="text-sm text-[#5A7799]">{result.pagination.total} bản ghi âm phổi</p>
        {result.data.length === 0 && <div className="card p-10 text-center text-[#5A7799]">Chưa có bản ghi âm phổi.</div>}
        <div className="space-y-3">{result.data.map((recording) => <article key={recording.id} className="card flex flex-wrap items-center gap-5 p-5">
          <div className="min-w-48 flex-1">
            <Link href={`/patients/${recording.patient_id}`} className="font-extrabold text-[#173A5E] hover:text-[#2F78C8]">{recording.patient_name}</Link>
            <p className="mt-1 text-xs text-[#5A7799]">{recording.patient_code}</p>
            <p className="mt-2 text-xs text-[#5A7799]">Ghi nhận: {new Date(recording.uploaded_at ?? recording.visit_started_at).toLocaleString("vi-VN")}</p>
          </div>
          <div className="min-w-40 flex-1">
            <div className="flex flex-wrap gap-2">{recording.labels.map((label) => <CycleLabelBadge key={label} value={label} />)}</div>
            <p className="mt-2 text-xs text-[#5A7799]">{({ not_analyzed: "Chưa phân tích", analyzing: "Đang phân tích", failed: "Phân tích thất bại", completed: "Đã phân tích" })[recording.analysis_status]}</p>
          </div>
          <div className="text-xs text-[#5A7799]">
            <p>Thời lượng: {recording.duration_ms === null ? "—" : `${(recording.duration_ms / 1000).toFixed(1)} giây`}</p>
            <p className="mt-2">Đã đánh giá: {recording.reviewed_count}/{recording.cycle_count} chu kỳ</p>
          </div>
          <Link className="btn-secondary" href={`/recordings/${recording.id}`}>Nghe & đánh giá</Link>
        </article>)}</div>
        <div className="flex items-center justify-end gap-4 text-sm">
          <button className="btn-secondary disabled:opacity-40" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page}/{Math.max(1, result.pagination.total_pages)}</span>
          <button className="btn-secondary disabled:opacity-40" disabled={page >= result.pagination.total_pages} onClick={() => setPage(page + 1)}>Sau</button>
        </div>
      </>}
    </div>
  );
}
