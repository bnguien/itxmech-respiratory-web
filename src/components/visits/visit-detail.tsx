"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Radio,
  Save,
  Stethoscope,
  Wifi,
} from "lucide-react";
import type { ApiError, Visit, VisitStatus } from "@/types/visit";

const statusLabels: Record<VisitStatus, string> = {
  in_progress: "Đang khám",
  completed: "Đã khám",
  cancelled: "Đã hủy",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} · ${part("hour")}:${part("minute")}`;
}

function errorMessage(payload: ApiError | null, fallback: string) {
  return payload?.error.message || fallback;
}

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

const genderLabels = { male: "Nam", female: "Nữ", other: "Khác" } as const;

export function VisitDetail({
  patientId,
  visitId,
  returnTab = "overview",
}: {
  patientId: string;
  visitId: string;
  returnTab?: string;
}) {
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [note, setNote] = useState("");
  const [version, setVersion] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const transitionInFlightRef = useRef(false);
  const allowNavigationRef = useRef(false);
  const draftKey = `respicare:visit-draft:${visitId}`;

  useEffect(() => {
    const controller = new AbortController();
    async function loadVisit() {
      try {
        const response = await fetch(
          `/api/patients/${patientId}/visits/${visitId}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as { data: Visit } | ApiError;
        if (!response.ok || !("data" in payload)) {
          setLoadError(
            errorMessage(payload as ApiError, "Không thể tải thông tin lần khám."),
          );
          return;
        }
        const loadedVisit = payload.data;
        setVisit(loadedVisit);
        setNote(loadedVisit.clinical_note || "");
        setVersion(loadedVisit.version);

        if (loadedVisit.can_edit) {
          try {
            const rawDraft = sessionStorage.getItem(draftKey);
            if (rawDraft) {
              const draft = JSON.parse(rawDraft) as {
                clinical_note?: unknown;
                version?: unknown;
              };
              if (
                typeof draft.clinical_note === "string" &&
                Number.isInteger(draft.version) &&
                Number(draft.version) >= 1
              ) {
                setNote(draft.clinical_note);
                setVersion(Number(draft.version));
                setIsDirty(true);
              }
            }
          } catch {
            sessionStorage.removeItem(draftKey);
          }
        }
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError"))
          setLoadError("Không thể tải thông tin lần khám.");
      }
    }
    void loadVisit();
    return () => controller.abort();
  }, [draftKey, patientId, visitId]);

  useEffect(() => {
    if (!isDirty) return;
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({ clinical_note: note, version, draft_updated_at: Date.now() }),
    );
  }, [draftKey, isDirty, note, version]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const interceptLink = (event: MouseEvent) => {
      if (allowNavigationRef.current || event.defaultPrevented || event.button !== 0)
        return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.origin !== window.location.origin
      )
        return;
      const destination = `${anchor.pathname}${anchor.search}${anchor.hash}`;
      const current = `${location.pathname}${location.search}${location.hash}`;
      if (destination === current) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(destination);
    };
    const interceptBack = () => {
      if (allowNavigationRef.current) return;
      const destination = `${location.pathname}${location.search}${location.hash}`;
      history.forward();
      setPendingNavigation(destination);
    };
    document.addEventListener("click", interceptLink, true);
    window.addEventListener("popstate", interceptBack);
    return () => {
      document.removeEventListener("click", interceptLink, true);
      window.removeEventListener("popstate", interceptBack);
    };
  }, [isDirty]);

  const save = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);
    if (savePromiseRef.current) return savePromiseRef.current;
    const request = (async () => {
      setIsSaving(true);
      setSaveError("");
      try {
        const response = await fetch(`/api/patients/${patientId}/visits/${visitId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinical_note: note, version }),
        });
        const payload = (await response.json()) as { data: Visit } | ApiError;
        if (!response.ok || !("data" in payload)) {
          setSaveError(errorMessage(payload as ApiError, "Không thể lưu lần khám."));
          return false;
        }
        setVisit(payload.data);
        setVersion(payload.data.version);
        setIsDirty(false);
        sessionStorage.removeItem(draftKey);
        setLastSavedAt(new Date());
        return true;
      } catch {
        setSaveError("Không thể lưu lần khám. Vui lòng thử lại.");
        return false;
      } finally {
        setIsSaving(false);
        savePromiseRef.current = null;
      }
    })();
    savePromiseRef.current = request;
    return request;
  }, [draftKey, isDirty, note, patientId, version, visitId]);

  async function saveAndNavigate() {
    if (!pendingNavigation) return;
    const destination = pendingNavigation;
    if (!(await save())) return;
    allowNavigationRef.current = true;
    setPendingNavigation(null);
    router.push(destination);
  }

  async function completeVisit() {
    if (transitionInFlightRef.current || savePromiseRef.current || isSaving) return;
    transitionInFlightRef.current = true;
    setIsCompleting(true);
    setSaveError("");
    try {
      let activeVersion = version;
      if (isDirty) {
        if (!(await save())) {
          setSaveError("Không thể hoàn tất vì dữ liệu chưa được lưu. Vui lòng thử lại.");
          return;
        }
        activeVersion += 1;
      }
      const response = await fetch(
        `/api/patients/${patientId}/visits/${visitId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: activeVersion }),
        },
      );
      const payload = (await response.json()) as
        | { data: { status: "completed"; version: number; completed_at: string } }
        | ApiError;
      if (!response.ok || !("data" in payload)) {
        setSaveError(errorMessage(payload as ApiError, "Không thể hoàn tất lần khám."));
        return;
      }
      setVersion(payload.data.version);
      setVisit((current) => current ? {
        ...current,
        status: "completed",
        completed_at: payload.data.completed_at,
        version: payload.data.version,
        can_edit: false,
      } : current);
      setIsDirty(false);
      sessionStorage.removeItem(draftKey);
    } catch {
      setSaveError("Không thể hoàn tất lần khám. Vui lòng thử lại.");
    } finally {
      setIsCompleting(false);
      transitionInFlightRef.current = false;
    }
  }

  async function cancelVisit() {
    if (transitionInFlightRef.current || savePromiseRef.current || isSaving) return;
    transitionInFlightRef.current = true;
    setIsCancelling(true);
    setSaveError("");
    try {
      const response = await fetch(
        `/api/patients/${patientId}/visits/${visitId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version }),
        },
      );
      const payload = (await response.json()) as
        | { data: { status: "cancelled"; version: number } }
        | ApiError;
      if (!response.ok || !("data" in payload)) {
        setSaveError(errorMessage(payload as ApiError, "Không thể hủy lần khám."));
        return;
      }
      setVersion(payload.data.version);
      setVisit((current) => current ? {
        ...current,
        status: "cancelled",
        version: payload.data.version,
        can_edit: false,
      } : current);
      setIsDirty(false);
      sessionStorage.removeItem(draftKey);
      setShowCancelConfirmation(false);
    } catch {
      setSaveError("Không thể hủy lần khám. Vui lòng thử lại.");
    } finally {
      setIsCancelling(false);
      transitionInFlightRef.current = false;
    }
  }

  if (loadError) return <div className="p-8 text-sm text-red-600">{loadError}</div>;
  if (!visit) return <div className="p-8 text-sm text-[#5A7799]">Đang tải lần khám...</div>;

  const busy = isSaving || isCompleting || isCancelling;
  const patientAge = ageFromDate(visit.patient_date_of_birth);
  return (
    <div className="w-full max-w-[1600px] px-5 pb-12 pt-5 sm:px-8 lg:px-10 xl:px-12">
      <header className="border-b border-[#E7F1FB] pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href={`/patients/${patientId}?tab=${returnTab}`}
              aria-label={returnTab === "history" ? "Lịch sử khám bệnh nhân" : "Hồ sơ bệnh nhân"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#5A7799] transition hover:bg-[#F3F7FC] hover:text-[#2F78C8]"
            >
              <ArrowLeft size={25} strokeWidth={1.8} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[14px] font-extrabold uppercase tracking-[0.045em] text-[#2F78C8]">
                  {visit.status === "in_progress" ? "Lần khám mới" : "Chi tiết lần khám"}
                </span>
                <span className="rounded-full bg-[#E6F1FC] px-3.5 py-1 text-[12px] font-bold text-[#2F78C8]">
                  {statusLabels[visit.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <h1 className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-[#173A5E] sm:text-[30px]">
                  {visit.patient_name}
                </h1>
                <span className="rounded-md bg-[#F1F5FA] px-2.5 py-1 font-mono text-[13px] text-[#5A7799]">
                  {visit.patient_code}
                </span>
                <span className="text-[14px] text-[#6F89A8]">
                  {patientAge} tuổi · {genderLabels[visit.patient_gender]}
                </span>
                <span className="hidden text-[#9DB3CB] sm:inline">·</span>
                <span className="text-[14px] text-[#5A7799]">
                  Chẩn đoán nền:{" "}
                  <b className="font-bold text-[#173A5E]">
                    {visit.patient_background_diagnosis || "Chưa ghi nhận"}
                  </b>
                  <em className="ml-2 text-[12px] text-[#7F99B7]">
                    (Do bác sĩ ghi nhận)
                  </em>
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0 pl-[60px] text-left lg:pl-0 lg:text-right">
            <p className="text-[14px] font-bold text-[#173A5E]">{visit.doctor_name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#6F89A8] lg:justify-end">
              <Clock3 size={15} className="text-[#9EC9F3]" />
              {formatDateTime(visit.started_at)}
            </p>
            {visit.status === "in_progress" && visit.updated_at !== visit.started_at && (
              <p className="mt-1 text-[12px] text-[#8AA3BF]">
                Chỉnh sửa lúc {formatDateTime(visit.updated_at)}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,2.08fr)_minmax(350px,1fr)]">
        <VisitMockClinicalPanels />

        <section className="rounded-[22px] border border-[#DFEAF5] bg-white p-7 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
          <h2 className="text-[18px] font-extrabold text-[#173A5E]">Ghi chú lần khám</h2>
          <p className="mt-6 max-w-[390px] text-[14px] leading-5 text-[#6F89A8]">
            Nhập nhận xét lâm sàng hoặc hướng theo dõi tiếp theo
          </p>

          <textarea
            value={note}
            readOnly={!visit.can_edit}
            onChange={(event) => {
              setNote(event.target.value);
              setIsDirty(true);
              setSaveError("");
            }}
            placeholder="Nhập nhận xét hoặc hướng theo dõi cho lần khám này..."
            className="mt-6 min-h-[225px] w-full resize-none rounded-[16px] border border-[#E2ECF6] bg-[#F3F7FC] px-4 py-4 text-[14px] leading-6 text-[#173A5E] outline-none transition placeholder:text-[#8DA4BE] focus:border-[#9EC9F3] focus:bg-white focus:ring-2 focus:ring-[#E4F1FD] read-only:cursor-default read-only:bg-[#F5F8FC]"
          />

          <div className="mt-7 border-t border-[#E4EDF6] pt-5">
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <span className="text-[#6F89A8]">Trạng thái lần khám:</span>
              <b className="text-[#2F78C8]">{statusLabels[visit.status]}</b>
            </div>
            {visit.can_edit && (
              <div className="mt-3 flex items-center justify-between gap-4 text-[12px]">
                <span className="text-[#6F89A8]">Trạng thái dữ liệu:</span>
                <span className={isDirty ? "font-semibold text-amber-600" : "font-semibold text-[#5A7799]"}>
                  {isDirty
                    ? "Có thay đổi chưa lưu"
                    : lastSavedAt
                      ? `Đã lưu lúc ${lastSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                      : "Đã lưu"}
                </span>
              </div>
            )}
          </div>

          {saveError && <p className="mt-4 text-sm leading-5 text-red-600">{saveError}</p>}

          {visit.can_edit && (
            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={() => void completeVisit()}
                disabled={busy}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#347FC9] text-[14px] font-bold text-white shadow-[0_2px_4px_rgba(47,120,200,0.2)] transition hover:bg-[#286FB8] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isCompleting ? (
                  <LoaderCircle size={19} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={19} />
                )}
                {isCompleting ? "Đang hoàn tất..." : "Hoàn tất lần khám"}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!isDirty || busy}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#CFE1F3] bg-white text-[12px] font-bold text-[#2F78C8] transition hover:bg-[#F4F8FD] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSaving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                  {isSaving ? "Đang lưu..." : "Lưu ghi chú"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirmation(true)}
                  disabled={busy}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#F3D7DA] bg-white text-[12px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-45"
                >
                  <Ban size={15} />
                  Hủy lần khám
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      {pendingNavigation && <Modal title="Bạn có thay đổi chưa được lưu." description="Vui lòng lưu trước khi rời khỏi trang." error={saveError} actions={<><button type="button" disabled={busy} onClick={() => setPendingNavigation(null)} className="btn-secondary">Ở lại</button><button type="button" disabled={busy} onClick={() => void saveAndNavigate()} className="btn-primary disabled:opacity-50">{isSaving ? "Đang lưu..." : "Lưu và tiếp tục"}</button></>} />}
      {showCancelConfirmation && <Modal title="Hủy lần khám?" description={`Lần khám sẽ chuyển sang chỉ xem.${isDirty ? " Các thay đổi chưa lưu hiện tại sẽ bị bỏ qua." : ""}`} actions={<><button type="button" disabled={isCancelling} onClick={() => setShowCancelConfirmation(false)} className="btn-secondary">Quay lại</button><button type="button" disabled={isCancelling} onClick={() => void cancelVisit()} className="btn-primary !bg-red-600 disabled:opacity-50">{isCancelling ? "Đang hủy..." : "Xác nhận hủy"}</button></>} />}
    </div>
  );
}

function Modal({ title, description, error, actions }: { title: string; description: string; error?: string; actions: React.ReactNode }) {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-[#5A7799]">{description}</p>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-2">{actions}</div></div></div>;
}

function VisitMockClinicalPanels() {
  const trend = [89, 90, 89, 90, 89, 89];
  return (
    <div className="space-y-8">
      <section className="rounded-[22px] border border-[#DFEAF5] bg-white p-6 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E7F2FC] text-[#2F78C8]">
              <Activity size={25} />
            </span>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#173A5E]">SpO₂</h2>
              <p className="text-[14px] text-[#6F89A8]">Dữ liệu thời gian thực từ cảm biến kẹp ngón</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DFEAF5] bg-[#F5F8FC] px-4 py-2 text-[13px] text-[#6482A5]">
            <Radio size={15} className="text-[#69A9E8]" />
            SPO2-001 · Đã kết nối
          </span>
        </div>
        <div className="mt-6 flex flex-col gap-5 rounded-[17px] border border-[#D9E9F8] bg-[#FBFDFF] px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <b className="text-[38px] font-extrabold leading-none tracking-[-0.04em] text-[#EF4444] sm:text-[42px]">89%</b>
            <span className="rounded-full bg-red-50 px-3 py-1 text-[13px] font-bold text-[#EF4444]">Cần theo dõi</span>
            <span className="text-[14px] text-[#6F89A8]">Cập nhật vài giây trước</span>
          </div>
          <div className="flex items-end gap-3 self-end sm:self-auto">
            <span className="pb-1 text-[12px] uppercase tracking-wide text-[#9EC9F3]">Xu hướng:</span>
            <div className="flex items-end gap-2">
              {trend.map((value, index) => (
                <div key={`${value}-${index}`} className="text-center">
                  <small className="block text-[10px] text-[#6482A5]">{value}</small>
                  <i className={`mt-1 block h-8 w-3 rounded-full ${index % 3 === 1 ? "bg-[#2F78C8]" : "bg-[#EF4444]"}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#DFEAF5] bg-white p-6 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E7F2FC] text-[#2F78C8]">
              <Stethoscope size={25} />
            </span>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#173A5E]">Âm phổi</h2>
              <p className="text-[14px] text-[#6F89A8]">Ống nghe sẽ đồng bộ tự động khi áp vào cơ thể</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DFEAF5] bg-[#F5F8FC] px-4 py-2 text-[13px] text-[#6482A5]">
            <i className="h-2.5 w-2.5 rounded-full bg-[#82B4E7]" />
            STETHO-001 · Đã kết nối
          </span>
        </div>

        <div className="mt-7 flex min-h-[300px] flex-col items-center justify-center rounded-[18px] border border-[#CFE4F8] bg-[linear-gradient(180deg,#FCFEFF_0%,#FFFFFF_100%)] px-6 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#BFDDF7] bg-[#E7F2FC] text-[#2F78C8]">
            <Stethoscope size={35} />
          </span>
          <h3 className="mt-5 text-[17px] font-extrabold text-[#173A5E]">Đang chờ bản ghi từ ống nghe…</h3>
          <p className="mt-2 text-[14px] text-[#6F89A8]">Áp ống nghe vào vị trí cần nghe. Bản ghi sẽ được đồng bộ tự động.</p>
          <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#2F78C8] bg-white px-5 py-2.5 text-[14px] font-bold text-[#2F78C8] transition hover:bg-[#F4F8FD]">
            <Wifi size={17} />
            Mô phỏng áp ống nghe lên ngực
          </button>
        </div>

        <div className="mt-8 border-t border-[#E4EDF6] pt-5">
          <h3 className="text-[15px] font-extrabold text-[#173A5E]">Âm phổi trong lần khám (0 bản ghi)</h3>
          <div className="mt-5 rounded-[16px] bg-[#F3F7FC] px-6 py-8 text-center text-[14px] text-[#6F89A8]">
            Chưa có bản ghi âm phổi nào trong lần khám này. Vui lòng áp ống nghe để thu nhận tín hiệu.
          </div>
        </div>
      </section>
    </div>
  );
}
