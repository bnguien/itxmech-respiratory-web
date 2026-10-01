"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StartVisitModal } from "@/components/visits/start-visit-modal";
import { EditPatientModal } from "@/components/patients/patient-profile-view";
import { ArchivePatientModal } from "@/components/patients/archive-patient-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientListResponse, PatientRecord } from "@/types/patient";

const genderLabels = { male: "Nam", female: "Nữ", other: "Khác" } as const;

function ageFromDate(date: string) {
  const birth = new Date(`${date}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age -= 1;
  return age;
}

export function PatientsList({ archived = false }: { archived?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(
    null,
  );
  const [actionId, setActionId] = useState<string | null>(null);
  const [patientToArchive, setPatientToArchive] =
    useState<PatientRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedQuery) params.set("q", debouncedQuery);
      const endpoint = `/api/patients${archived ? "/archive" : ""}?${params}`;
      const response = await fetch(endpoint, {
        cache: "no-store",
      });
      const payload = (await response.json()) as PatientListResponse & {
        error?: { message?: string };
      };
      if (!response.ok) {
        console.error("[PatientsList] Không thể tải danh sách bệnh nhân", {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          response: payload,
        });
        throw new Error(
          payload.error?.message || "Không thể tải danh sách bệnh nhân.",
        );
      }
      setPatients(payload.data);
      setPagination(payload.pagination);
    } catch (caught) {
      console.error("[PatientsList] Lỗi khi tải danh sách bệnh nhân", {
        endpoint: `/api/patients${archived ? "/archive" : ""}`,
        query: debouncedQuery,
        page,
        error: caught,
      });
      setPatients([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể tải danh sách bệnh nhân.",
      );
    } finally {
      setLoading(false);
    }
  }, [archived, debouncedQuery, page]);

  useEffect(() => {
    // The callback owns the request state and is also reused after creating a patient.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPatients();
  }, [loadPatients]);

  async function archivePatient(patient: PatientRecord) {
    setActionId(patient.id);
    try {
      const response = await fetch(`/api/patients/${patient.id}/archive`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(
          payload.error?.message || "Không thể lưu trữ hồ sơ bệnh nhân.",
        );
      if (patients.length === 1 && page > 1) setPage((value) => value - 1);
      else await loadPatients();
      setPatientToArchive(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể lưu trữ hồ sơ bệnh nhân.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function restorePatient(patient: PatientRecord) {
    setActionId(patient.id);
    try {
      const response = await fetch(`/api/patients/${patient.id}/restore`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(
          payload.error?.message || "Không thể khôi phục hồ sơ bệnh nhân.",
        );
      if (patients.length === 1 && page > 1) setPage((value) => value - 1);
      else await loadPatients();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể khôi phục hồ sơ bệnh nhân.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <>
      <div className="page w-full space-y-6">
        <PageHeader
          title={archived ? "Bệnh nhân đã lưu trữ" : "Bệnh nhân"}
          description={
            archived
              ? "Các hồ sơ đã được lưu trữ và có thể khôi phục"
              : "Danh sách bệnh nhân đang được theo dõi"
          }
          action={
            !archived && (
              <button
                onClick={() => setOpen(true)}
                className="btn-primary self-start shadow-xs hover:shadow-md"
              >
                <Plus size={15} />
                Thêm bệnh nhân
              </button>
            )
          }
        />
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field !pl-10"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Tìm theo tên, mã hoặc số điện thoại..."
            />
          </div>
          <div className="flex rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] p-1">
            <span className="chip chip-active">
              Tất cả ({pagination.total})
            </span>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(240px,2fr)_minmax(200px,1.5fr)_110px_170px_110px] items-center gap-4 border-b border-[#E7F1FB] bg-[#F8FAFD] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A7799]">
            <div>Bệnh nhân</div>
            <div>Chẩn đoán nền</div>
            <div className="text-center">SpO₂</div>
            <div className="text-center">Âm phổi AI</div>
            <div className="text-center">Thao tác</div>
          </div>
          <div className="divide-y divide-[#E7F1FB]">
            {!loading &&
              patients.map((patient) => (
                <div
                  key={patient.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/patients/${patient.id}`);
                    }
                  }}
                  className="group cursor-pointer flex flex-col md:grid md:grid-cols-[minmax(240px,2fr)_minmax(200px,1.5fr)_110px_170px_110px] items-start md:items-center gap-3 md:gap-4 px-5 py-3.5 transition hover:bg-[#F4F8FD]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2F78C8]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#9EC9F3]/40 bg-[#E7F1FB] text-xs font-bold text-[#173A5E]">
                      {patient.full_name
                        .split(" ")
                        .slice(-2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-bold text-[#173A5E] transition group-hover:text-[#2F78C8]">
                        {patient.full_name}
                      </strong>
                      <small className="block truncate text-xs text-[#5A7799]">
                        {patient.patient_code} ·{" "}
                        {ageFromDate(patient.date_of_birth)} tuổi ·{" "}
                        {genderLabels[patient.gender]}
                      </small>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-[#173A5E]">
                      {patient.background_diagnosis || "Chưa ghi nhận"}
                    </span>
                    <span className="block text-[11px] text-[#5A7799]">
                      Do bác sĩ ghi nhận
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-center text-xs font-bold text-[#9EC9F3]">
                      —
                    </span>
                  </div>
                  <span className="text-center text-xs font-bold text-[#9EC9F3]">
                    Chưa có dữ liệu
                  </span>
                  <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="flex items-center justify-end gap-1">
                    {archived ? (
                      <>
                        <button
                          type="button"
                          disabled={actionId === patient.id}
                          onClick={() => void restorePatient(patient)}
                          className="rounded-lg p-2 text-[#2F78C8] transition hover:bg-[#E7F1FB] disabled:opacity-50"
                          title="Khôi phục hồ sơ bệnh nhân"
                          aria-label={`Khôi phục ${patient.full_name}`}
                        >
                          <RotateCcw size={16} />
                        </button>
                        <Link href={`/patients/${patient.id}`} className="rounded-lg p-2 text-[#9EC9F3] transition hover:bg-[#E7F1FB] hover:text-[#2F78C8]" title="Xem chi tiết" aria-label={`Xem ${patient.full_name}`}><ChevronRight size={17} /></Link>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingPatient(patient)}
                          className="rounded-lg p-2 text-[#2F78C8] transition hover:bg-[#E7F1FB]"
                          title="Sửa bệnh nhân"
                          aria-label={`Sửa ${patient.full_name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={actionId === patient.id}
                          onClick={() => setPatientToArchive(patient)}
                          className="rounded-lg p-2 text-[#2F78C8] transition hover:bg-[#E7F1FB] disabled:opacity-50"
                          title="Lưu trữ"
                          aria-label={`Lưu trữ ${patient.full_name}`}
                        >
                          <Archive size={16} />
                        </button>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="rounded-lg p-2 text-[#9EC9F3] transition hover:bg-[#E7F1FB] hover:text-[#2F78C8]"
                          title="Xem chi tiết"
                          aria-label={`Xem ${patient.full_name}`}
                        >
                          <ChevronRight size={17} />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
          {loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="hidden md:grid grid-cols-[minmax(240px,2fr)_minmax(200px,1.5fr)_110px_170px_110px] items-center gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="mx-auto h-4 w-8" />
                <Skeleton className="mx-auto h-4 w-24" />
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          {loading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`mobile-${index}`}
                className="space-y-3 px-5 py-4 md:hidden"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          {!loading && error && (
            <p className="p-12 text-center text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && patients.length === 0 && (
            <p className="p-12 text-center text-sm text-[#5A7799]">
              {archived
                ? "Không có bệnh nhân nào đã lưu trữ."
                : "Không tìm thấy bệnh nhân phù hợp."}
            </p>
          )}
        </div>
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm text-[#5A7799]">
            <button
              className="btn-secondary !p-2"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Trang {pagination.page} / {pagination.total_pages}
            </span>
            <button
              className="btn-secondary !p-2"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Trang sau"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
      {!archived && (
        <StartVisitModal
          open={open}
          onClose={() => setOpen(false)}
          onPatientCreated={loadPatients}
        />
      )}
      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={(updated) => {
            setPatients((current) =>
              current.map((patient) =>
                patient.id === updated.id ? updated : patient,
              ),
            );
            setEditingPatient(null);
          }}
        />
      )}
      {patientToArchive && (
        <ArchivePatientModal
          patientName={patientToArchive.full_name}
          isArchiving={actionId === patientToArchive.id}
          onClose={() => setPatientToArchive(null)}
          onConfirm={() => void archivePatient(patientToArchive)}
        />
      )}
    </>
  );
}
