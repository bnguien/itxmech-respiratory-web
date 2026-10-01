"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { PatientDateField, PatientGenderField, PatientNameField } from "@/components/ui/patient-form-fields";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientListResponse, PatientRecord } from "@/types/patient";

const genderLabels = { male: "Nam", female: "Nữ", other: "Khác" } as const;

export function StartVisitModal({
  open,
  onClose,
  onPatientCreated,
}: {
  open: boolean;
  onClose: () => void;
  onPatientCreated?: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<PatientRecord[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || adding) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingResults(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: "20",
          page: "1",
        });
        const response = await fetch(`/api/patients?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        setResults(((await response.json()) as PatientListResponse).data);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError"))
          setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoadingResults(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [adding, open, query]);

  if (!open) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          date_of_birth: form.get("date_of_birth"),
          gender: form.get("gender"),
          phone: form.get("phone"),
          background_diagnosis: form.get("background_diagnosis"),
        }),
      });
      const payload = (await response.json()) as {
        data?: PatientRecord;
        error?: { message?: string; details?: Array<{ message: string }> };
      };
      if (!response.ok || !payload.data) {
        setError(
          payload.error?.details?.[0]?.message ||
            payload.error?.message ||
            "Không thể tạo hồ sơ bệnh nhân.",
        );
        return;
      }
      await onPatientCreated?.();
      onClose();
      router.push(`/patients/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("Không thể tạo hồ sơ bệnh nhân.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E7F1FB] p-5">
          <div>
            <h2 className="font-bold text-[#173A5E]">Thêm bệnh nhân</h2>
            <p className="mt-1 text-xs text-[#5A7799]">
              Chọn bệnh nhân cũ hoặc thêm hồ sơ bệnh nhân mới
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5A7799] hover:bg-[#F4F8FD]"
            aria-label="Đóng"
          >
            <X size={19} />
          </button>
        </div>
        {!adding ? (
          <div className="p-5">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLoadingResults(true);
                }}
                className="field !pl-10"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="Tìm theo tên, mã bệnh nhân hoặc số điện thoại..."
              />
            </div>
            <button
              onClick={() => setAdding(true)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-[#9EC9F3] p-3 text-left text-xs font-bold text-[#2F78C8] hover:bg-[#F4F8FD]"
            >
              <span className="rounded-lg bg-[#E7F1FB] p-2">
                <UserPlus size={17} />
              </span>
              Thêm bệnh nhân mới
            </button>
            <div className="mt-4 max-h-72 divide-y divide-[#E7F1FB] overflow-auto">
              {loadingResults && Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-3.5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
              {!loadingResults && results.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  className="flex w-full items-center justify-between px-2 py-3 text-left hover:bg-[#F4F8FD]"
                >
                  <span>
                    <strong className="block text-sm text-[#173A5E]">
                      {patient.full_name}
                    </strong>
                    <span className="text-[11px] text-[#5A7799]">
                      {patient.patient_code} · {genderLabels[patient.gender]}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#2F78C8]">Chọn</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
                Họ và tên
                <PatientNameField />
              </label>
              <label className="text-xs font-semibold text-[#5A7799]">
                Ngày sinh
                <PatientDateField required name="date_of_birth" />
              </label>
              <label className="text-xs font-semibold text-[#5A7799]">
                Giới tính
                <PatientGenderField name="gender" />
              </label>
              <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
                Số điện thoại
                <input
                  name="phone"
                  className="field mt-1"
                  placeholder="090..."
                />
              </label>
              <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
                Chẩn đoán nền{" "}
                <em className="font-normal">(do bác sĩ ghi nhận)</em>
                <input
                  name="background_diagnosis"
                  className="field mt-1"
                  placeholder="Ví dụ: COPD"
                />
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setError("");
                }}
                className="btn-secondary"
              >
                Quay lại
              </button>
              <button disabled={submitting} className="btn-primary">
                {submitting ? "Đang lưu..." : "Tạo hồ sơ"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
