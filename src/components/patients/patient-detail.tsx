"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Patient, Recording } from "@/types/clinical";
import { Spo2Chart } from "@/components/dashboard/spo2-chart";
import { AudioWaveform } from "@/components/recordings/audio-waveform";
import { useMockVisits } from "@/components/visits/mock-visit-context";
import { spo2DataByRange } from "@/constants/spo2";
import { Spo2Monitor } from "./spo2-monitor";
import { VisitHistory } from "./visit-history";

type Spo2Range = "24h" | "7d" | "30d";
const spo2Ranges: Array<{ id: Spo2Range; label: string }> = [
  { id: "24h", label: "24 giờ" },
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
];

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

function getCurrentTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} · ${hours}:${minutes}`;
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
}: {
  patient: Patient;
  patientRecordings: Recording[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completedVisits } = useMockVisits();
  const visits = [
    ...completedVisits.filter((visit) => visit.patientId === patient.id),
    ...patient.visits,
  ];
  const latest = patientRecordings[0];
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<PatientTab>(
    isPatientTab(requestedTab) ? requestedTab : "overview",
  );
  const [spo2Range, setSpo2Range] = useState<Spo2Range>("24h");
  const currentSpo2Data = spo2DataByRange[spo2Range];

  const [notes, setNotes] = useState<PatientNote[]>(() => [
    {
      id: "note-1",
      content:
        visits[0]?.note ||
        "Theo dõi SpO₂, cân nhắc hỗ trợ oxy nếu dưới 88%. Tiếp tục theo dõi và đánh giá lại âm phổi trong lần khám tiếp theo.",
      createdAt: "27/09/2026 · 15:35",
      doctor: "BS. Nguyễn Bảo Nguyên",
    },
  ]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: PatientNote = {
      id: `note-${Date.now()}`,
      content: newNoteText.trim(),
      createdAt: getCurrentTimestamp(),
      doctor: "BS. Nguyễn Bảo Nguyên",
    };
    setNotes((prev) => [newNote, ...prev]);
    setNewNoteText("");
    setIsAddingNote(false);
  };

  const handleStartEditNote = (note: PatientNote) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  };

  const handleSaveEditNote = (noteId: string) => {
    if (!editingNoteText.trim()) return;
    const nowTimestamp = getCurrentTimestamp();
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === noteId
          ? {
            ...n,
            content: editingNoteText.trim(),
            createdAt: nowTimestamp,
          }
          : n,
      );
      const editedItem = updated.find((n) => n.id === noteId);
      const remaining = updated.filter((n) => n.id !== noteId);
      return editedItem ? [editedItem, ...remaining] : updated;
    });
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (editingNoteId === noteId) {
      setEditingNoteId(null);
      setEditingNoteText("");
    }
  };

  const spo2Summary = useMemo(() => {
    const values = currentSpo2Data.map((point) => point.value);
    return {
      current: values.at(-1) ?? patient.spo2,
      average: Math.round(
        values.reduce((total, val) => total + val, 0) / values.length,
      ),
      lowest: Math.min(...values),
    };
  }, [currentSpo2Data, patient.spo2]);

  useEffect(() => {
    if (isPatientTab(requestedTab)) {
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
    <div className="w-full p-5 sm:p-8 lg:p-12">
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
              <span className="rounded-lg bg-[#F1F6FB] px-3 py-1 font-mono text-sm text-[#5A7799]">
                {patient.code}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#5A7799]">
              {patient.age} tuổi&nbsp;&nbsp;·&nbsp;&nbsp;{patient.gender}
              &nbsp;&nbsp;·&nbsp;&nbsp;{patient.phone}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-[#8BBCEC]">Chẩn đoán nền:</span>&nbsp;{" "}
              <b>{patient.diagnosis}</b>&nbsp;{" "}
              <em className="text-[#9EC9F3]">(Do bác sĩ ghi nhận)</em>&nbsp;{" "}
              <Pencil size={14} className="inline text-[#79B1E8]" />
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-[390px] items-center rounded-3xl border border-[#CCE2F7] bg-[#F2F7FD] px-7 py-6">
            <div className="flex-1 border-r border-[#CCE2F7]">
              <span className="text-xs uppercase tracking-wide text-[#5A7799]">
                SpO₂ hiện tại
              </span>
              <p className="mt-1 text-4xl font-extrabold text-[#EF4444]">
                {patient.spo2}% <small className="text-sm">Thấp</small>
              </p>
            </div>
            <div className="flex-1 pl-8">
              <span className="text-xs uppercase tracking-wide text-[#5A7799]">
                Âm phổi AI
              </span>
              <p className="mt-1 font-extrabold text-[#EF4444]">
                {patient.sound}
              </p>
              <small className="text-[#8BBCEC]">({patient.confidence}%)</small>
            </div>
          </div>
          <Link
            href={`/patients/${patient.id}/visits/new?from=${tab}`}
            className="btn-primary whitespace-nowrap px-6 py-4 text-sm"
          >
            <Plus size={18} />
            Tạo lần khám mới
          </Link>
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
                    Theo dõi thời gian thực
                  </p>
                </div>
                <div className="flex rounded-xl bg-[#F1F6FB] p-1 text-sm">
                  {spo2Ranges.map((rangeItem) => (
                    <button
                      key={rangeItem.id}
                      type="button"
                      onClick={() => setSpo2Range(rangeItem.id)}
                      className={`rounded-lg px-4 py-1.5 transition ${spo2Range === rangeItem.id
                          ? "bg-white font-bold text-[#173A5E] shadow-sm"
                          : "text-[#5A7799] hover:text-[#2F78C8]"
                        }`}
                    >
                      {rangeItem.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-12">
                <Spo2Chart data={currentSpo2Data} />
              </div>
              <div className="mt-4 grid grid-cols-3 border-t border-[#E1ECF7] pt-5 text-center">
                <div>
                  <small className="text-[#5A7799]">Hiện tại</small>
                  <p className="mt-1 text-xl font-extrabold text-[#EF4444]">
                    {spo2Summary.current}%
                  </p>
                </div>
                <div>
                  <small className="text-[#5A7799]">Trung bình</small>
                  <p className="mt-1 text-xl font-extrabold text-[#173A5E]">
                    {spo2Summary.average}%
                  </p>
                </div>
                <div>
                  <small className="text-[#5A7799]">Thấp nhất</small>
                  <p className="mt-1 text-xl font-extrabold text-[#EF4444]">
                    {spo2Summary.lowest}%
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
                  <span className="rounded-xl bg-[#FFF0F1] px-4 py-2 text-sm font-bold text-[#EF4444]">
                    {latest.classification}
                  </span>
                </div>
                <div className="my-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#5A7799]">
                  <span>
                    Độ tin cậy:{" "}
                    <b className="text-[#173A5E]">{latest.confidence}%</b>
                  </span>
                  <span>·</span>
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
                <h2 className="font-extrabold uppercase text-[#173A5E]">Ghi chú lâm sàng</h2>
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
                          <p className="flex-1 text-[#173A5E]">{item.content}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              title="Chỉnh sửa ghi chú"
                              aria-label="Chỉnh sửa ghi chú"
                              onClick={() => handleStartEditNote(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-[#E1ECF7] hover:text-[#2F78C8]"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              title="Xóa ghi chú"
                              aria-label="Xóa ghi chú"
                              onClick={() => handleDeleteNote(item.id)}
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

              {isAddingNote ? (
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
                      Lưu ghi chú
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNote(true)}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#2F78C8] hover:underline"
                >
                  + Thêm ghi chú mới
                </button>
              )}
            </section>
            <section className="card p-7">
              <h2 className="font-extrabold uppercase">Cảnh báo gần nhất</h2>
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/60 p-5">
                <p className="font-semibold text-[#EF4444]">
                  ●&nbsp; SpO₂ giảm xuống {patient.spo2}%
                </p>
                <small className="ml-6 mt-1 block text-[#9EC9F3]">
                  5 phút trước
                </small>
              </div>
            </section>
          </aside>
        </div>
      )}

      {tab === "spo2" && <Spo2Monitor />}
      {tab === "sound" && (
        <div className="card mt-8 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_180px_160px] items-center gap-4 border-b border-[#E7F1FB] bg-[#F8FAFD] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A7799]">
            <div>Thời điểm & Chi tiết</div>
            <div className="text-center">Chu kỳ ghi âm</div>
            <div className="text-right">Phân loại AI</div>
          </div>
          <div className="divide-y divide-[#E7F1FB]">
            {patientRecordings.map((recording) => (
              <Link
                key={recording.id}
                href={`/recordings/${recording.id}?from=patient&patientId=${patient.id}&tab=sound`}
                className="grid grid-cols-1 sm:grid-cols-[1fr_180px_160px] items-center gap-4 p-5 transition hover:bg-[#F4F8FD]"
              >
                <div>
                  <b className="text-sm font-bold text-[#173A5E]">{recording.recordedAt}</b>
                  <span className="mt-0.5 block text-xs text-[#5A7799]">
                    Mã: {recording.id} · Thiết bị: {recording.deviceId}
                  </span>
                </div>
                <div className="text-center text-xs font-bold text-[#5A7799]">
                  {recording.duration}s · {recording.cycles.length} chu kỳ
                </div>
                <div className="flex justify-end">
                  <span className="inline-flex rounded-full bg-red-50 border border-red-200/80 px-3 py-1 text-xs font-extrabold text-[#EF4444]">
                    {recording.classification}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {tab === "history" && <VisitHistory patient={patient} visits={visits} />}
      {tab === "notes" && (
        <section className="card mt-8 p-7 space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold text-[#173A5E] sm:text-lg">
                Ghi chú lâm sàng ({notes.length})
              </h2>
              <p className="mt-1 text-xs text-[#5A7799]">
                Toàn bộ chỉ định và lưu ý theo dõi của bác sĩ cho bệnh nhân {patient.name}
              </p>
            </div>
            {!isAddingNote && (
              <button
                type="button"
                onClick={() => setIsAddingNote(true)}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold self-start sm:self-auto"
              >
                + Thêm ghi chú mới
              </button>
            )}
          </div>

          {isAddingNote && (
            <div className="rounded-2xl border border-[#CCE2F7] bg-[#F8FAFD] p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#173A5E]">Tạo ghi chú lâm sàng</h3>
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
                  disabled={!newNoteText.trim()}
                  onClick={handleAddNote}
                  className="btn-primary px-4 py-2 text-xs font-bold disabled:opacity-40"
                >
                  Lưu ghi chú
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
                      <p className="flex-1 text-[#173A5E]">{item.content}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title="Chỉnh sửa ghi chú"
                          aria-label="Chỉnh sửa ghi chú"
                          onClick={() => handleStartEditNote(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-[#E1ECF7] hover:text-[#2F78C8]"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title="Xóa ghi chú"
                          aria-label="Xóa ghi chú"
                          onClick={() => handleDeleteNote(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5A7799] transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#8BBCEC]">
                      <span>{item.createdAt} · {item.doctor}</span>
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
