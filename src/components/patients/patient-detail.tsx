"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Patient, Recording } from "@/types/clinical";
import { Spo2Chart } from "@/components/dashboard/spo2-chart";
import { AudioWaveform } from "@/components/recordings/audio-waveform";
import { usePatientWearable } from "@/lib/wearable/use-patient-wearable";
import { assessmentTriggerLabels, formatClock, formatSpo2, wearableLevelStyles } from "@/lib/wearable/presentation";
import { Spo2Monitor } from "./spo2-monitor";
import { WearableConnectionBanner, useCurrentReading } from "./wearable-connection";
import { RANGE_SPEC, WEARABLE_RANGES, hasChartData, summarizeChart, type WearableRange } from "@/lib/wearable/chart";
import { VisitHistory } from "./visit-history";
import { PatientRecordingsList } from "@/components/recordings/patient-recordings-list";
import { CycleLabelBadge, SoundLabel } from "@/components/ui/status-badge";
import { legacyCycleLabel } from "@/lib/recordings/presentation";


const tabs = [
  ["overview", "Tổng quan"],
  ["spo2", "SpO₂"],
  ["sound", "Âm phổi"],
  ["history", "Lịch sử khám"],
  ["notes", "Ghi chú"],
] as const;
type PatientTab = (typeof tabs)[number][0];

function isPatientTab(value: string | null): value is PatientTab {
  return tabs.some(([id]) => id === value);
}

const INITIAL_SYMPTOMS_ID = "initial-symptoms";
const noteTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface DoctorNoteApi {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  doctor_name: string;
}

function toPatientNote(note: DoctorNoteApi): PatientNote {
  const edited = note.updated_at !== note.created_at;
  return {
    id: note.id,
    content: note.content,
    createdAt: `${noteTimeFormat.format(new Date(note.updated_at))}${edited ? " (đã sửa)" : ""}`,
    doctor: note.doctor_name,
  };
}

interface PatientNote {
  id: string;
  content: string;
  createdAt: string;
  doctor: string;
}

export function PatientDetail({
  patient,
  patientRecordings,
  onEdit,
  onArchive,
  onRestore,
  isArchived = false,
  restoring = false,
  hasClinicalData = true,
}: {
  patient: Patient;
  patientRecordings: Recording[];
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  isArchived?: boolean;
  restoring?: boolean;
  hasClinicalData?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latest = patientRecordings[0];
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<PatientTab>(
    isPatientTab(requestedTab) ? requestedTab : "overview",
  );
  const [spo2Range, setSpo2Range] = useState<WearableRange>("24h");
  // SpO₂ thật của bệnh nhân (vòng → app → server), dùng chung cho tab Tổng quan và tab SpO₂.
  const wearable = usePatientWearable(patient.id, spo2Range);
  const current = useCurrentReading(wearable.data);
  const currentSpo2Data = useMemo(() => wearable.data?.chart ?? [], [wearable.data]);
  const wearableConfig = wearable.data?.config;
  const wearableAssessments = wearable.data?.assessments ?? [];
  const latestAssessment = wearableAssessments.at(-1);
  const latestSampleSpo2 = wearable.data?.samples.findLast((sample) => sample.spo2_mean !== null)?.spo2_mean ?? null;
  const hasWearableData = latestAssessment !== undefined || latestSampleSpo2 !== null;
  const latestNotified = wearableAssessments.findLast(
    (item) => item.notify.watch || item.notify.alert || item.notify.critical,
  );
  const latestLevelStyle = wearableLevelStyles[latestAssessment?.level ?? "UNKNOWN"];

  // Lời dặn lưu ở server (bảng doctor_notes), người nhà đọc trên app. Triệu chứng ban đầu lấy từ hồ sơ, chỉ hiện trên web.
  const [savedNotes, setSavedNotes] = useState<PatientNote[]>([]);
  const [initialSymptoms, setInitialSymptoms] = useState<string | null>(patient.initialSymptoms ?? null);
  const notes = useMemo<PatientNote[]>(
    () => [
      ...savedNotes,
      ...(initialSymptoms
        ? [{ id: INITIAL_SYMPTOMS_ID, content: initialSymptoms, createdAt: "Ghi nhận ban đầu", doctor: "Triệu chứng ban đầu (chỉ hiện trên web)" }]
        : []),
    ],
    [savedNotes, initialSymptoms],
  );
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [noteError, setNoteError] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  /** Gọi API lời dặn; thành công thì thay danh sách bằng bản server trả về. */
  const callNotes = useCallback(
    async (path: string, init?: RequestInit) => {
      setNoteError("");
      try {
        const response = await fetch(`/api/patients/${patient.id}/notes${path}`, {
          cache: "no-store",
          ...init,
          headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        });
        const payload = (await response.json()) as {
          data?: DoctorNoteApi[];
          error?: { message?: string; details?: Array<{ message: string }> };
        };
        if (!response.ok || !payload.data) {
          setNoteError(payload.error?.details?.[0]?.message || payload.error?.message || "Không thể cập nhật lời dặn.");
          return false;
        }
        setSavedNotes(payload.data.map(toPatientNote));
        return true;
      } catch {
        setNoteError("Không thể cập nhật lời dặn.");
        return false;
      }
    },
    [patient.id],
  );

  useEffect(() => {
    // Tải danh sách lần đầu; callNotes tự quản lý trạng thái và được dùng lại sau mỗi thao tác.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void callNotes("");
  }, [callNotes]);

  const updateInitialSymptoms = async (value: string | null) => {
    const response = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initial_symptoms: value }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message?: string } };
      setNoteError(payload.error?.message || "Không thể cập nhật triệu chứng ban đầu.");
      return false;
    }
    setInitialSymptoms(value);
    return true;
  };

  const handleAddNote = async () => {
    if (isArchived || !newNoteText.trim() || noteBusy) return;
    setNoteBusy(true);
    const ok = await callNotes("", { method: "POST", body: JSON.stringify({ content: newNoteText.trim() }) });
    setNoteBusy(false);
    if (ok) {
      setNewNoteText("");
      setIsAddingNote(false);
    }
  };

  const handleStartEditNote = (note: PatientNote) => {
    if (isArchived) return;
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  };

  const handleSaveEditNote = async (noteId: string) => {
    if (isArchived || !editingNoteText.trim() || noteBusy) return;
    setNoteBusy(true);
    const ok =
      noteId === INITIAL_SYMPTOMS_ID
        ? await updateInitialSymptoms(editingNoteText.trim())
        : await callNotes(`/${noteId}`, { method: "PATCH", body: JSON.stringify({ content: editingNoteText.trim() }) });
    setNoteBusy(false);
    if (ok) {
      setEditingNoteId(null);
      setEditingNoteText("");
    }
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (isArchived || noteBusy) return;
    setNoteBusy(true);
    const ok = noteId === INITIAL_SYMPTOMS_ID ? await updateInitialSymptoms(null) : await callNotes(`/${noteId}`, { method: "DELETE" });
    setNoteBusy(false);
    if (ok && editingNoteId === noteId) {
      setEditingNoteId(null);
      setEditingNoteText("");
    }
  };

  const spo2Summary = useMemo(() => {
    const chart = summarizeChart(currentSpo2Data);
    return {
      current: latestSampleSpo2 ?? chart?.current ?? null,
      average: chart?.average ?? null,
      lowest: chart?.lowest ?? null,
    };
  }, [currentSpo2Data, latestSampleSpo2]);

  useEffect(() => {
    if (isPatientTab(requestedTab)) {
      // Sync the URL-selected tab when navigating within the patient detail.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(requestedTab);
    }
  }, [requestedTab]);

  const handleTabChange = (nextTab: PatientTab) => {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/patients/${patient.id}?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className="w-full px-5 pb-5 pt-3 sm:px-8 sm:pb-8 sm:pt-5 lg:px-12 lg:pb-12 lg:pt-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A7799] hover:text-[#2F78C8]"
      >
        <ArrowLeft size={17} />
        Danh sách bệnh nhân
      </Link>

      <header className="mt-8 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#A8D1F7] bg-[#EAF4FD] text-2xl font-extrabold text-[#2F78C8]">
            {patient.name
              .split(" ")
              .slice(-2)
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#173A5E]">
                {patient.name}
              </h1>
              {isArchived && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Đã lưu trữ</span>}
              <div className="flex shrink-0 items-center gap-2">
                {onEdit && (
                  <button type="button" onClick={onEdit} className="btn-secondary whitespace-nowrap px-4 py-2.5 text-sm text-[#2F78C8]">
                    <Pencil size={16} />
                    Chỉnh sửa
                  </button>
                )}
                {onArchive && (
                  <button type="button" onClick={onArchive} className="btn-secondary whitespace-nowrap px-4 py-2.5 text-sm text-[#2F78C8]">
                    <Archive size={16} />
                    Lưu trữ
                  </button>
                )}
                {onRestore && (
                  <button type="button" onClick={onRestore} disabled={restoring} className="btn-primary whitespace-nowrap px-4 py-2.5 text-sm disabled:opacity-60">
                    <RotateCcw size={16} />
                    {restoring ? "Đang khôi phục..." : "Khôi phục hồ sơ"}
                  </button>
                )}
              </div>
            </div>
            <span className="mt-2 inline-flex rounded-md bg-[#F1F6FB] px-2.5 py-1 font-mono text-xs text-[#5A7799]">
              {patient.code}
            </span>
            <p className="mt-2 text-sm text-[#5A7799]">
              {patient.age} tuổi&nbsp;&nbsp;·&nbsp;&nbsp;{patient.gender}
              &nbsp;&nbsp;·&nbsp;&nbsp;{patient.phone}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-[#8BBCEC]">Chẩn đoán nền:</span>&nbsp;{" "}
              <b>{patient.diagnosis}</b>
              <em className="mt-1 block text-[#9EC9F3]">(Do bác sĩ ghi nhận)</em>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-[390px] items-center rounded-3xl border border-[#CCE2F7] bg-[#F2F7FD] px-7 py-6">
            <div className="flex-1 border-r border-[#CCE2F7]">
              <span className="text-xs uppercase tracking-wide text-[#5A7799]">
                SpO₂ hiện tại
              </span>
              {hasWearableData && current && !current.fresh ? (
                // Mất kết nối: không giữ mức "Bình thường" cũ, nói rõ không nhận được SpO₂.
                <p className="mt-1 text-4xl font-extrabold text-[#9EB4CC]">
                  —{" "}
                  <small className="text-sm text-red-600">Mất tín hiệu SpO₂</small>
                </p>
              ) : (
                <p className={`mt-1 text-4xl font-extrabold ${hasWearableData ? latestLevelStyle.text : "text-[#5A7799]"}`}>
                  {hasWearableData
                    ? formatSpo2(current?.reading?.spo2 ?? latestSampleSpo2 ?? latestAssessment?.spo2_now ?? null)
                    : "—"}{" "}
                  <small className="text-sm">
                    {hasWearableData ? latestLevelStyle.name : "Chưa có dữ liệu"}
                  </small>
                </p>
              )}
            </div>
            <div className="flex-1 pl-8">
              <span className="text-xs uppercase tracking-wide text-[#5A7799]">
                Âm phổi AI
              </span>
              <p className="mt-1 font-extrabold text-[#5A7799]">
                {hasClinicalData ? <SoundLabel value={patient.sound} /> : "Chưa có dữ liệu"}
              </p>
            </div>
          </div>
          {!isArchived && <Link
            href={`/patients/${patient.id}/visits/new?from=${tab}`}
            className="btn-primary whitespace-nowrap px-6 py-4 text-sm"
          >
            <Plus size={18} />
            Tạo lần khám mới
          </Link>}
        </div>
      </header>

      <nav className="mt-9 flex gap-3 overflow-x-auto border-y border-[#E1ECF7]">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`border-b-2 px-4 py-4 text-sm font-semibold ${tab === id ? "border-[#2F78C8] text-[#2F78C8]" : "border-transparent text-[#5A7799]"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1.35fr_.95fr]">
          <div className="space-y-8">
            <section className="card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold">Xu hướng SpO₂</h2>
                  <p className="mt-1 text-sm text-[#5A7799]">
                    {wearable.live ? "● Cập nhật trực tiếp từ vòng" : "Theo dõi từ vòng đeo SpO₂"}
                  </p>
                </div>
                <div className="flex rounded-xl bg-[#F1F6FB] p-1 text-sm">
                  {WEARABLE_RANGES.map((rangeItem) => (
                    <button
                      key={rangeItem.id}
                      type="button"
                      onClick={() => setSpo2Range(rangeItem.id)}
                      className={`rounded-lg px-4 py-1.5 transition ${
                        spo2Range === rangeItem.id
                          ? "bg-white font-bold text-[#173A5E] shadow-sm"
                          : "text-[#5A7799] hover:text-[#2F78C8]"
                      }`}
                    >
                      {rangeItem.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <WearableConnectionBanner
                  device={wearable.data?.device ?? null}
                  uploadIntervalMin={wearableConfig?.upload_interval_min}
                  loading={wearable.loading && !wearable.data}
                />
              </div>
              <div className="mt-6">
                {hasChartData(currentSpo2Data) ? (
                  <Spo2Chart
                    data={currentSpo2Data}
                    range={spo2Range}
                    threshold={wearableConfig?.T}
                    criticalThreshold={wearableConfig?.critical.crit_T}
                  />
                ) : (
                  <div className="flex h-[340px] items-center justify-center rounded-2xl border border-dashed border-[#DDE8F4] text-sm text-[#5A7799]">
                    {wearable.loading ? "Đang tải…" : "Chưa có số đo SpO₂. Người nhà kết nối vòng trên app để bắt đầu."}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-[#5A7799]">{RANGE_SPEC[spo2Range].note} · Đoạn trống: không có số đo (mất kết nối hoặc không đeo vòng)</p>
              <div className="mt-4 grid grid-cols-3 border-t border-[#E1ECF7] pt-5 text-center">
                <div>
                  <small className="text-[#5A7799]">Hiện tại</small>
                  {current && !current.fresh && current.reading ? (
                    <>
                      <p className="mt-1 text-xl font-extrabold text-[#9EB4CC]">—</p>
                      <p className="text-[11px] font-semibold text-red-600">Mất tín hiệu</p>
                    </>
                  ) : (
                    <p className="mt-1 text-xl font-extrabold text-[#EF4444]">
                      {formatSpo2(current?.reading?.spo2 ?? spo2Summary.current)}
                    </p>
                  )}
                </div>
                <div>
                  <small className="text-[#5A7799]">Trung bình</small>
                  <p className="mt-1 text-xl font-extrabold text-[#173A5E]">
                    {formatSpo2(spo2Summary.average)}
                  </p>
                </div>
                <div>
                  <small className="text-[#5A7799]">Thấp nhất</small>
                  <p className="mt-1 text-xl font-extrabold text-[#EF4444]">
                    {formatSpo2(spo2Summary.lowest)}
                  </p>
                </div>
              </div>
            </section>

            {latest && (
              <section className="card p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold">Âm phổi gần nhất</h2>
                    <p className="mt-1 text-sm text-[#5A7799]">
                      Ghi nhận lúc {latest.recordedAt}
                    </p>
                  </div>
                  <CycleLabelBadge value={legacyCycleLabel[latest.classification]} />
                </div>
                <div className="my-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#5A7799]">
                  <span>
                    Thời lượng:{" "}
                    <b className="text-[#173A5E]">{latest.duration}s</b>
                  </span>
                  <span>·</span>
                  <span>
                    Chu kỳ:{" "}
                    <b className="text-[#173A5E]">
                      {latest.cycles.length} chu kỳ
                    </b>
                  </span>
                </div>
                <AudioWaveform
                  audioUrl={latest.audioUrl || `/audio/${latest.id}.wav`}
                  cycles={latest.cycles}
                  duration={latest.duration}
                  compact
                />
                <div className="mt-6">
                  <Link
                    href={`/recordings/${latest.id}?from=patient&patientId=${patient.id}&tab=overview`}
                    className="btn-secondary px-5 py-3 text-sm"
                  >
                    <ExternalLink size={16} />
                    Xem phân tích chi tiết
                  </Link>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-8">
            <section className="card p-7">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold uppercase text-[#173A5E]">
                  Ghi chú lâm sàng
                </h2>
                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange("notes")}
                    className="text-xs font-semibold text-[#8BBCEC] hover:text-[#2F78C8]"
                  >
                    Xem tất cả ({notes.length})
                  </button>
                )}
              </div>
              <div className="mt-5 space-y-3">
                {noteError && <p className="text-sm text-red-600">{noteError}</p>}
                {notes.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#DCEAF8] bg-[#F2F7FD] p-5 text-sm leading-7"
                  >
                    {editingNoteId === item.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="field min-h-24 w-full bg-white p-3 text-xs leading-5"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEditNote}
                            className="rounded-xl border border-[#DDEAF8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A7799] hover:bg-[#F2F7FD]"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={!editingNoteText.trim()}
                            onClick={() => handleSaveEditNote(item.id)}
                            className="btn-primary px-3.5 py-1.5 text-xs font-bold disabled:opacity-40"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="flex-1 text-[#173A5E]">
                            {item.content}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              disabled={isArchived}
                              title="Chỉnh sửa ghi chú"
                              aria-label="Chỉnh sửa ghi chú"
                              onClick={() => handleStartEditNote(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-[#E1ECF7] hover:text-[#2F78C8]"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={isArchived}
                              title="Xóa ghi chú"
                              aria-label="Xóa ghi chú"
                              onClick={() => void handleDeleteNote(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <small className="mt-3 block text-[#8BBCEC]">
                          {item.createdAt} · {item.doctor}
                        </small>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {!isArchived && (isAddingNote ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-[#CCE2F7] bg-[#F8FAFD] p-4">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Nhập ghi chú lâm sàng mới cho bệnh nhân..."
                    className="field min-h-24 w-full bg-white p-3 text-xs leading-5"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNoteText("");
                      }}
                      className="rounded-xl border border-[#DDEAF8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A7799] hover:bg-[#F2F7FD]"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={!newNoteText.trim()}
                      onClick={handleAddNote}
                      className="btn-primary px-3.5 py-1.5 text-xs font-bold disabled:opacity-40"
                    >
                      {noteBusy ? "Đang lưu..." : "Lưu lời dặn"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNote(true)}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#2F78C8] hover:underline"
                >
                  + Thêm lời dặn
                </button>
              ))}
            </section>
            <section className="card p-7">
              <h2 className="font-extrabold uppercase">Cảnh báo gần nhất</h2>
              {latestNotified ? (
                <div className={`mt-5 rounded-2xl border p-5 ${wearableLevelStyles[latestNotified.level].badge}`}>
                  <p className="font-semibold">
                    ●&nbsp; {wearableLevelStyles[latestNotified.level].name}:{" "}
                    {assessmentTriggerLabels[latestNotified.trigger]}
                  </p>
                  <small className="ml-6 mt-1 block">
                    SpO₂ {formatSpo2(latestNotified.spo2_now)} · {formatClock(latestNotified.ts)}
                  </small>
                </div>
              ) : (
                <p className="mt-5 text-sm text-[#5A7799]">Chưa có cảnh báo từ vòng đeo tay.</p>
              )}
            </section>
          </aside>
        </div>
      )}

      {tab === "spo2" && (
        <Spo2Monitor
          patientId={patient.id}
          wearable={wearable.data}
          loading={wearable.loading}
          error={wearable.error}
          live={wearable.live}
          range={spo2Range}
          onRangeChange={setSpo2Range}
          onConfigSaved={() => void wearable.reload()}
          readOnly={isArchived}
        />
      )}
      {tab === "sound" && <PatientRecordingsList patientId={patient.id} />}
      {tab === "history" && <VisitHistory patient={patient} readOnly={isArchived} />}
      {tab === "notes" && (
        <section className="card mt-8 p-7 space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold text-[#173A5E] sm:text-lg">
                Lời dặn của bác sĩ ({notes.length})
              </h2>
              <p className="mt-1 text-xs text-[#5A7799]">
                Người nhà của {patient.name} đọc các lời dặn này trên app RespiCare (một chiều, không trả lời).
              </p>
            </div>
            {!isArchived && !isAddingNote && (
              <button
                type="button"
                onClick={() => setIsAddingNote(true)}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold self-start sm:self-auto"
              >
                + Thêm lời dặn
              </button>
            )}
          </div>

          {noteError && <p className="text-sm text-red-600">{noteError}</p>}

          {!isArchived && isAddingNote && (
            <div className="rounded-2xl border border-[#CCE2F7] bg-[#F8FAFD] p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#173A5E]">
                Lời dặn mới (gửi tới app người nhà)
              </h3>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Nhập ghi chú lâm sàng, hướng dẫn điều trị, theo dõi SpO₂ và âm phổi..."
                className="field min-h-28 w-full bg-white text-xs leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNoteText("");
                  }}
                  className="rounded-xl border border-[#DDEAF8] bg-white px-4 py-2 text-xs font-semibold text-[#5A7799] hover:bg-[#F2F7FD]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!newNoteText.trim() || noteBusy}
                  onClick={() => void handleAddNote()}
                  className="btn-primary px-4 py-2 text-xs font-bold disabled:opacity-40"
                >
                  {noteBusy ? "Đang lưu..." : "Lưu lời dặn"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {notes.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#DCEAF8] bg-[#F2F7FD] p-5 text-sm leading-relaxed"
              >
                {editingNoteId === item.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="field min-h-24 w-full bg-white p-3 text-xs leading-5"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEditNote}
                        className="rounded-xl border border-[#DDEAF8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A7799] hover:bg-[#F2F7FD]"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={!editingNoteText.trim() || noteBusy}
                        onClick={() => void handleSaveEditNote(item.id)}
                        className="btn-primary px-3.5 py-1.5 text-xs font-bold disabled:opacity-40"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-[#173A5E]">{item.content}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={isArchived}
                          title="Chỉnh sửa ghi chú"
                          aria-label="Chỉnh sửa ghi chú"
                          onClick={() => handleStartEditNote(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-[#E1ECF7] hover:text-[#2F78C8]"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={isArchived}
                          title="Xóa ghi chú"
                          aria-label="Xóa ghi chú"
                          onClick={() => void handleDeleteNote(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#8BBCEC]">
                      <span>
                        {item.createdAt} · {item.doctor}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
