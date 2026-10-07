"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { Patient } from "@/types/clinical";
import type { ApiError, PaginatedVisitsResponse, VisitStatus } from "@/types/visit";

const statusLabels: Record<VisitStatus, string> = {
  in_progress: "Đang khám",
  completed: "Đã khám",
  cancelled: "Đã hủy",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VisitHistory({
  patient,
  readOnly = false,
}: {
  patient: Patient;
  readOnly?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedVisitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visitAction, setVisitAction] = useState<{
    visit: PaginatedVisitsResponse["data"][number];
    mode: "cancel" | "delete";
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/patients/${patient.id}/visits?page=${page}&limit=20`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as PaginatedVisitsResponse | ApiError;
      if (!response.ok || !("data" in payload)) {
        setError((payload as ApiError).error?.message || "Không thể tải lịch sử khám.");
        return;
      }
      setResult(payload);
    } catch {
      setError("Không thể tải lịch sử khám.");
    } finally {
      setLoading(false);
    }
  }, [page, patient.id]);

  useEffect(() => {
    // Data is intentionally fetched when the selected history page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function confirmVisitAction() {
    if (!visitAction || deleting) return;
    setDeleting(true);
    setActionError("");
    const permanentlyDelete = visitAction.mode === "delete";
    try {
      const response = await fetch(
        `/api/patients/${patient.id}/visits/${visitAction.visit.id}${permanentlyDelete ? "" : "/cancel"}`,
        {
          method: permanentlyDelete ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: visitAction.visit.version }),
        },
      );
      const payload = (await response.json()) as ApiError | { data: unknown };
      if (!response.ok) {
        setActionError(
          (payload as ApiError).error?.message ||
            (permanentlyDelete
              ? "Không thể xóa lần khám."
              : "Không thể hủy lần khám."),
        );
        return;
      }
      setVisitAction(null);
      await load();
    } catch {
      setActionError(
        permanentlyDelete
          ? "Không thể xóa lần khám."
          : "Không thể hủy lần khám.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="card mt-8 p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold">
            Lịch sử các lần khám ({result?.pagination.total ?? 0})
          </h2>
          <p className="mt-1 text-sm text-[#5A7799]">Các lần khám của bệnh nhân tại cơ sở.</p>
        </div>
        {!readOnly && <Link href={`/patients/${patient.id}/visits/new?from=history`} className="btn-primary self-start px-5 py-3 text-sm"><Plus size={17} />Tạo lần khám mới</Link>}
      </div>

      {loading && <p className="mt-8 text-sm text-[#5A7799]">Đang tải lịch sử khám...</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}
      {!loading && !error && result?.data.length === 0 && <p className="mt-8 text-sm text-[#5A7799]">Bệnh nhân chưa có lần khám nào.</p>}

      {!loading && !error && result && result.data.length > 0 && (
        <div className="relative mt-8 space-y-6 pl-12 before:absolute before:bottom-5 before:left-4 before:top-5 before:w-px before:bg-[#DCE9F6]">
          {result.data.map((visit) => (
            <article key={visit.id} className="card relative p-5">
              <i className="absolute -left-[42px] top-8 h-4 w-4 rounded-full border-2 border-white bg-[#2F78C8] shadow" />
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <b>{formatDateTime(visit.started_at)}</b>
                    {visit.status !== "in_progress" && (
                      <span className="rounded-full bg-[#EAF4FD] px-3 py-1 text-[10px] font-bold text-[#2F78C8]">
                        {statusLabels[visit.status]}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-[#5A7799]">Bác sĩ phụ trách: <b>{visit.doctor_name}</b></p>
                  {visit.status === "in_progress" && visit.updated_at !== visit.started_at && (
                    <p className="mt-1 text-xs text-[#8AA3BF]">Chỉnh sửa lúc {formatDateTime(visit.updated_at)}</p>
                  )}
                  {visit.clinical_note && <p className="mt-2 line-clamp-2 text-sm italic leading-6 text-[#5A7799]">“{visit.clinical_note}”</p>}
                </div>
                {visit.can_edit ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/patients/${patient.id}/visits/${visit.id}?from=history`}
                      className="btn-secondary text-[#2F78C8]"
                    >
                      <Pencil size={14} />
                      Sửa
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setVisitAction({ visit, mode: "cancel" });
                      }}
                      className="btn-secondary border-red-100 text-red-600 hover:bg-red-50"
                    >
                      <Ban size={14} />
                      Hủy
                    </button>
                  </div>
                ) : visit.can_delete ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/patients/${patient.id}/visits/${visit.id}?from=history`} className="btn-secondary text-[#2F78C8]">Xem chi tiết</Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setVisitAction({ visit, mode: "delete" });
                      }}
                      className="btn-secondary border-red-100 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </div>
                ) : (
                  <Link href={`/patients/${patient.id}/visits/${visit.id}?from=history`} className="btn-secondary shrink-0 text-[#2F78C8]">Xem chi tiết</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {result && result.pagination.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="btn-secondary px-3 disabled:opacity-50"><ChevronLeft size={16} />Trước</button>
          <span className="text-xs text-[#5A7799]">Trang {page}/{result.pagination.total_pages}</span>
          <button type="button" disabled={page >= result.pagination.total_pages || loading} onClick={() => setPage((current) => current + 1)} className="btn-secondary px-3 disabled:opacity-50">Sau<ChevronRight size={16} /></button>
        </div>
      )}

      {visitAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-[#173A5E]">
              {visitAction.mode === "delete" ? "Xóa lần khám?" : "Hủy lần khám?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5A7799]">
              {visitAction.mode === "delete"
                ? "Lần khám đã hủy sẽ bị xóa vĩnh viễn và không thể khôi phục."
                : "Lần khám sẽ được chuyển sang trạng thái đã hủy và vẫn được giữ lại trong lịch sử."}
            </p>
            {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setVisitAction(null)}
                className="btn-secondary"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmVisitAction()}
                className="btn-primary !bg-red-600 disabled:opacity-50"
              >
                {deleting
                  ? visitAction.mode === "delete"
                    ? "Đang xóa..."
                    : "Đang hủy..."
                  : visitAction.mode === "delete"
                    ? "Xác nhận xóa"
                    : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
