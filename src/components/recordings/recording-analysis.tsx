"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  Pause,
  Pencil,
  Play,
  X,
} from "lucide-react";
import type { Recording } from "@/types/clinical";
import { type AudioWaveformHandle } from "./audio-waveform";
import { LungSoundWaveformCard } from "./lung-sound-waveform-card";
import { SoundLabel } from "@/components/ui/status-badge";
import { CycleClassificationSelect } from "./cycle-classification-select";

export function RecordingAnalysis({ recording }: { recording: Recording }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const queryPatientId = searchParams.get("patientId");
  const tab = searchParams.get("tab");
  const visitId = searchParams.get("visitId");
  const returnTab = searchParams.get("returnTab");

  const effectivePatientId = queryPatientId || recording.patientId;

  let backHref = "/recordings";
  let backLabel = "Danh sách bản ghi";

  if (from === "visit" && visitId) {
    backHref = `/patients/${effectivePatientId}/visits/${visitId}${returnTab ? `?from=${returnTab}` : ""}`;
    backLabel = "Chi tiết lần khám";
  } else if (from === "patient" || queryPatientId) {
    const targetTab = tab || "sound";
    backHref = `/patients/${effectivePatientId}?tab=${targetTab}`;
    const tabLabels: Record<string, string> = {
      sound: "Âm phổi bệnh nhân",
      overview: "Tổng quan bệnh nhân",
      spo2: "SpO₂ bệnh nhân",
      history: "Lịch sử khám bệnh nhân",
      notes: "Ghi chú bệnh nhân",
    };
    backLabel = tabLabels[targetTab] || "Hồ sơ bệnh nhân";
  }

  const waveformRef = useRef<AudioWaveformHandle>(null);
  const [confirmed, setConfirmed] = useState(recording.status === "confirmed");
  const [editing, setEditing] = useState(false);
  const [classes, setClasses] = useState(
    recording.cycles.map((cycle) => cycle.classification),
  );
  const [draftClasses, setDraftClasses] = useState(classes);
  const [note, setNote] = useState(recording.note || "");
  const [playingCycleId, setPlayingCycleId] = useState<string | null>(null);
  const handleCyclePlaybackChange = useCallback(
    (cycleId: string | null) => setPlayingCycleId(cycleId),
    [],
  );
  const analyzedCycles = useMemo(
    () =>
      recording.cycles.map((cycle, index) => ({
        ...cycle,
        classification: classes[index],
      })),
    [classes, recording.cycles],
  );
  const counts = {
    Normal: classes.filter((value) => value === "Normal").length,
    Crackles: classes.filter((value) => value === "Crackles").length,
    Wheezes: classes.filter((value) => value === "Wheezes").length,
    Both: classes.filter((value) => value === "Crackles + Wheezes").length,
  };

  const startEditing = () => {
    setDraftClasses(classes);
    setEditing(true);
  };

  const saveEditing = () => {
    setClasses(draftClasses);
    setEditing(false);
  };

  const cancelEditing = () => {
    setDraftClasses(classes);
    setEditing(false);
  };

  return (
    <div className="w-full p-5 sm:p-8 lg:p-12">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A7799] hover:text-[#2F78C8]"
      >
        <ArrowLeft size={17} />
        {backLabel}
      </Link>
      <header className="mt-6 flex flex-col justify-between gap-4 border-b border-[#E1ECF7] pb-7 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold">{recording.patientName}</h1>
            <span className="rounded-lg bg-[#F1F6FB] px-3 py-1 font-mono text-sm text-[#5A7799]">
              {recording.patientCode}
            </span>
            <span
              className={`rounded-lg px-3 py-1 text-sm font-bold ${confirmed ? "bg-[#EAF4FD] text-[#2F78C8]" : "bg-[#FFF0F1] text-[#EF4444]"}`}
            >
              {confirmed ? "Đã xác nhận" : "Chờ duyệt"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#5A7799]">
            {recording.recordedAt}&nbsp;&nbsp;·&nbsp;&nbsp;{recording.duration}{" "}
            giây&nbsp;&nbsp;·&nbsp;&nbsp;{recording.deviceId}
          </p>
        </div>
        <Link
          href={`/patients/${effectivePatientId}${tab ? `?tab=${tab}` : ""}`}
          className="text-sm font-bold text-[#2F78C8]"
        >
          Xem hồ sơ bệnh nhân →
        </Link>
      </header>

      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,.85fr)]">
        <main className="space-y-8">
          <section className="flex flex-col justify-between gap-5 rounded-3xl border border-[#CCE2F7] bg-[#F2F7FD] px-7 py-6 sm:flex-row sm:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-[#8BBCEC]">
                Kết quả tổng hợp AI
              </span>
              <p className="mt-2 text-xl font-extrabold text-[#EF4444]">
                {recording.classification}{" "}
                <small className="font-medium text-[#5A7799]">
                  ({recording.confidence}%)
                </small>
              </p>
            </div>
            <div className="grid grid-cols-5 divide-x divide-[#D3E5F7] text-center">
              <div className="px-5">
                <b className="text-xl">{recording.cycles.length}</b>
                <small className="block text-[#8BBCEC]">Chu kỳ</small>
              </div>
              <div className="px-5">
                <b className="text-xl text-[#2F78C8]">{counts.Normal}</b>
                <small className="block text-[#5A7799]">Normal</small>
              </div>
              <div className="px-5">
                <b className="text-xl text-[#F59E0B]">{counts.Crackles}</b>
                <small className="block text-[#5A7799]">Crackles</small>
              </div>
              <div className="px-5">
                <b className="text-xl text-[#6366F1]">{counts.Wheezes}</b>
                <small className="block text-[#5A7799]">Wheezes</small>
              </div>
              <div className="px-5">
                <b className="text-xl text-[#EF4444]">{counts.Both}</b>
                <small className="block text-[#5A7799]">Both</small>
              </div>
            </div>
          </section>

          <LungSoundWaveformCard
            ref={waveformRef}
            audioUrl={recording.audioUrl || `/audio/${recording.id}.wav`}
            cycles={analyzedCycles}
            duration={recording.duration}
            onCyclePlaybackChange={handleCyclePlaybackChange}
          />

          <section className="card p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="whitespace-nowrap text-base font-extrabold sm:text-lg">
                Chi tiết từng chu kỳ hô hấp
              </h2>
              {editing ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={saveEditing}
                    title="Lưu chỉnh sửa"
                    aria-label="Lưu chỉnh sửa"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F78C8] text-white transition-colors hover:bg-[#286CB5]"
                  >
                    <Check size={19} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    title="Hủy chỉnh sửa"
                    aria-label="Hủy chỉnh sửa"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDEAF8] bg-white text-[#5A7799] transition-colors hover:border-[#F3B8BC] hover:bg-[#FFF5F5] hover:text-[#E5484D]"
                  >
                    <X size={19} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-[#CFE2F5] px-4 py-2.5 text-sm font-bold text-[#2F78C8] transition-colors hover:bg-[#F2F7FD]"
                >
                  <Pencil size={16} />
                  Chỉnh sửa
                </button>
              )}
            </div>

            <div className="mt-6 divide-y divide-[#E1ECF7]">
              {recording.cycles.map((cycle, index) => {
                const isPlaying = playingCycleId === cycle.id;

                return (
                  <div
                    key={cycle.id}
                    className="grid items-center gap-3 py-4 text-sm md:grid-cols-[110px_150px_minmax(220px,1fr)_150px]"
                  >
                    <b>Chu kỳ {String(cycle.number).padStart(2, "0")}</b>
                    <span className="font-mono text-[#8BBCEC]">
                      {cycle.start}s – {cycle.end}s
                    </span>

                    <div className="min-w-0 md:max-w-[320px]">
                      {editing ? (
                        <CycleClassificationSelect
                          value={draftClasses[index]}
                          onChange={(nextClass) =>
                            setDraftClasses((current) =>
                              current.map((value, itemIndex) =>
                                itemIndex === index ? nextClass : value,
                              ),
                            )
                          }
                        />
                      ) : (
                        <div className="flex min-h-11 items-center whitespace-nowrap">
                          <SoundLabel value={classes[index]} />
                          <small className="ml-2 text-[#9EC9F3]">
                            ({cycle.confidence}%)
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="flex w-[150px] items-center">
                      <button
                        type="button"
                        onClick={() =>
                          isPlaying
                            ? waveformRef.current?.pause()
                            : waveformRef.current?.playCycle({
                                ...cycle,
                                classification: classes[index],
                              })
                        }
                        className={`flex w-[138px] items-center gap-2 font-semibold ${isPlaying ? "text-[#2F78C8]" : "text-[#5A7799] hover:text-[#2F78C8]"}`}
                      >
                        {isPlaying ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}
                        <span className="w-[108px] text-left">
                          {isPlaying ? "Tạm dừng" : "Nghe đoạn này"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="card sticky top-8 p-7">
          <div className="flex items-center justify-between border-b border-[#E1ECF7] pb-5">
            <h2 className="text-lg font-extrabold">Xác nhận của bác sĩ</h2>
            <span className="rounded-lg bg-[#EAF4FD] px-3 py-1 text-xs font-bold text-[#2F78C8]">
              Lâm sàng
            </span>
          </div>
          <div className="mt-7 rounded-2xl bg-[#F2F7FD] p-5">
            <span className="text-xs font-bold uppercase text-[#8BBCEC]">
              Gợi ý từ AI:
            </span>
            <p className="mt-1 font-bold">
              {recording.classification}{" "}
              <small className="font-normal text-[#5A7799]">
                (Độ tin cậy: {recording.confidence}%)
              </small>
            </p>
          </div>
          <h3 className="mt-7 text-sm font-bold">Đánh giá của bác sĩ:</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setConfirmed(true);
                setEditing(false);
              }}
              className={`btn-secondary py-3 ${confirmed ? "border-[#2F78C8] bg-[#EAF4FD] text-[#2F78C8]" : ""}`}
            >
              <CheckCircle2 size={17} />
              Xác nhận kết quả
            </button>
            <button
              onClick={() => {
                startEditing();
                setConfirmed(false);
              }}
              className="btn-secondary py-3"
            >
              <Pencil size={17} />
              Chỉnh sửa
            </button>
          </div>
          <label className="mt-7 block text-sm font-bold">
            Ghi chú lâm sàng của bác sĩ:
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="field mt-3 min-h-28 resize-y bg-white font-normal"
              placeholder="Ví dụ: Ran rít thì thở ra, kèm ran nổ thưa thớt đáy phổi phải..."
            />
          </label>
          <button
            onClick={() => {
              setConfirmed(true);
              setEditing(false);
            }}
            className="btn-primary mt-6 w-full py-3.5 text-sm"
          >
            Lưu xác nhận
          </button>
          <div className="mt-7 flex gap-3 border-t border-[#E1ECF7] pt-6 text-xs leading-6 text-[#9EC9F3]">
            <CircleAlert size={18} className="shrink-0" />
            <p>
              Kết quả AI chỉ mang tính hỗ trợ và không thay thế đánh giá chuyên
              môn của bác sĩ.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
