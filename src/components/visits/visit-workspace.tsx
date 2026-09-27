"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  LoaderCircle,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Save,
  Stethoscope,
  Waves,
  X,
} from "lucide-react";
import type { LungSound, Patient, RespiratoryCycle, VisitStage } from "@/types/clinical";
import { SoundLabel } from "@/components/ui/status-badge";
import { LungSoundWaveformCard } from "@/components/recordings/lung-sound-waveform-card";
import { type AudioWaveformHandle } from "@/components/recordings/audio-waveform";
import { CycleClassificationSelect } from "@/components/recordings/cycle-classification-select";
import { useMockVisits } from "./mock-visit-context";

const steps: Array<{ id: VisitStage; label: string }> = [
  { id: "waiting", label: "Đang chờ bản ghi" },
  { id: "receiving", label: "Đang nhận bản ghi" },
  { id: "received", label: "Đã nhận bản ghi" },
  { id: "analyzing", label: "Đang phân tích AI" },
  { id: "ready", label: "Kết quả AI đã sẵn sàng" },
  { id: "review", label: "Chờ bác sĩ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
];

const order = steps.map((s) => s.id);

const options: LungSound[] = [
  "Normal",
  "Crackles",
  "Wheezes",
  "Crackles + Wheezes",
];

const DURATION_SECONDS = 24.6;

const INITIAL_CYCLES: RespiratoryCycle[] = [
  { id: "c1", number: 1, start: 0.0, end: 3.0, classification: "Crackles", confidence: 94 },
  { id: "c2", number: 2, start: 3.0, end: 6.1, classification: "Crackles + Wheezes", confidence: 91 },
  { id: "c3", number: 3, start: 6.1, end: 9.1, classification: "Wheezes", confidence: 89 },
  { id: "c4", number: 4, start: 9.1, end: 12.2, classification: "Normal", confidence: 96 },
  { id: "c5", number: 5, start: 12.2, end: 15.3, classification: "Crackles", confidence: 92 },
  { id: "c6", number: 6, start: 15.3, end: 18.3, classification: "Crackles + Wheezes", confidence: 90 },
  { id: "c7", number: 7, start: 18.3, end: 21.3, classification: "Normal", confidence: 95 },
  { id: "c8", number: 8, start: 21.3, end: 24.4, classification: "Wheezes", confidence: 88 },
];

export function VisitWorkspace({ patient }: { patient: Patient }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromTab = searchParams.get("from") || "overview";
  const { addCompletedVisit } = useMockVisits();

  const [stage, setStage] = useState<VisitStage>("waiting");
  const [spo2, setSpo2] = useState<number>(patient.spo2 || 92);
  const [classes, setClasses] = useState<LungSound[]>(
    INITIAL_CYCLES.map((c) => c.classification),
  );
  const [draftClasses, setDraftClasses] = useState<LungSound[]>(
    INITIAL_CYCLES.map((c) => c.classification),
  );
  const [editing, setEditing] = useState<boolean>(true);
  const [note, setNote] = useState("");

  const waveformRef = useRef<AudioWaveformHandle>(null);
  const [playingCycleId, setPlayingCycleId] = useState<string | null>(null);
  const handleCyclePlaybackChange = useCallback(
    (cycleId: string | null) => setPlayingCycleId(cycleId),
    [],
  );

  const idx = order.indexOf(stage);
  const results = idx >= 4; // ready, review, confirmed

  const saveEditing = () => {
    setClasses(draftClasses);
    setEditing(false);
    setStage("confirmed");
  };

  const cancelEditing = () => {
    setDraftClasses(classes);
    setEditing(false);
  };

  const startEditing = () => {
    setDraftClasses(classes);
    setEditing(true);
    setStage("review");
  };

  const currentCycles: RespiratoryCycle[] = useMemo(
    () =>
      INITIAL_CYCLES.map((c, i) => ({
        ...c,
        classification: (editing ? draftClasses[i] : classes[i]) ?? c.classification,
      })),
    [classes, draftClasses, editing],
  );

  // Automatic state progression: receiving -> received -> analyzing -> ready
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (stage === "receiving") {
      timer = setTimeout(() => {
        setStage("received");
      }, 1500);
    } else if (stage === "received") {
      // Show received (with duration) briefly, then automatically transition to analyzing
      timer = setTimeout(() => {
        setStage("analyzing");
      }, 1200);
    } else if (stage === "analyzing") {
      // AI analysis in progress, then automatically ready
      timer = setTimeout(() => {
        setStage("ready");
      }, 1800);
    }
    return () => clearTimeout(timer);
  }, [stage]);

  const activeClasses = editing ? draftClasses : classes;
  const counts = useMemo(() => {
    return {
      Normal: activeClasses.filter((c) => c === "Normal").length,
      Crackles: activeClasses.filter((c) => c === "Crackles").length,
      Wheezes: activeClasses.filter((c) => c === "Wheezes").length,
      "Crackles + Wheezes": activeClasses.filter((c) => c === "Crackles + Wheezes").length,
    };
  }, [activeClasses]);

  const dominantSound: LungSound = useMemo(() => {
    if (counts["Crackles + Wheezes"] > 0) return "Crackles + Wheezes";
    if (counts.Crackles > 0 && counts.Wheezes > 0) return "Crackles + Wheezes";
    if (counts.Crackles > 0) return "Crackles";
    if (counts.Wheezes > 0) return "Wheezes";
    return "Normal";
  }, [counts]);

  const startReceiving = () => {
    setStage("receiving");
  };

  const finish = () => {
    addCompletedVisit({
      id: `VIS-${Date.now().toString().slice(-4)}`,
      patientId: patient.id,
      startedAt: "27/09/2026 · 16:20",
      doctor: "BS. Nguyễn Bảo Nguyên",
      spo2,
      status: "completed",
      recordingId: "REC-001",
      result: dominantSound,
      note: note.trim() || "Đã theo dõi SpO₂ và bản ghi âm phổi hoàn chỉnh. Bác sĩ xác nhận kết quả lâm sàng.",
    });
    router.push(`/patients/${patient.id}?tab=history`);
  };

  return (
    <div className="w-full max-w-[1650px] p-6 sm:p-8 space-y-6">
      <Link
        href={`/patients/${patient.id}?tab=${fromTab}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A7799] hover:text-[#2F78C8]"
      >
        <ArrowLeft size={17} />
        {fromTab === "history" ? "Lịch sử khám bệnh nhân" : "Hồ sơ bệnh nhân"}
      </Link>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="eyebrow">Lần khám mới · {patient.code}</span>
          <h1 className="page-title mt-1">{patient.name}</h1>
          <p className="page-subtitle">
            Bắt đầu lúc 16:20 · BS. Nguyễn Bảo Nguyên
          </p>
        </div>
        <span className="self-start rounded-full bg-[#E7F1FB] px-3 py-1.5 text-xs font-bold text-[#2F78C8]">
          Đang khám
        </span>
      </div>

      {/* Stepper bar */}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[760px] items-center">
          {steps.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${i < idx
                      ? "border-[#2F78C8] bg-[#2F78C8] text-white"
                      : i === idx
                        ? "border-[#2F78C8] bg-[#E7F1FB] text-[#2F78C8]"
                        : "border-[#E7F1FB] text-[#9EC9F3]"
                    }`}
                >
                  {i < idx ? <Check size={13} /> : i + 1}
                </span>
                <small
                  className={`text-[9px] ${i <= idx ? "font-bold text-[#2F78C8]" : "text-[#9EC9F3]"
                    }`}
                >
                  {s.label}
                </small>
              </div>
              {i < steps.length - 1 && (
                <i
                  className={`mb-4 h-px flex-1 ${i < idx ? "bg-[#2F78C8]" : "bg-[#E7F1FB]"
                    }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px]">
        {/* Main Left: SpO2 + Âm phổi */}
        <div className="space-y-6">
          {/* Section 1: SpO2 */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">SpO₂</h2>
                <p className="mt-1 text-xs text-[#5A7799]">
                  Dữ liệu nhận từ cảm biến được gán cho bệnh nhân
                </p>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#2F78C8]">
                <Radio size={12} />
                {stage === "waiting" ? "SPO2-001 · Đang kết nối" : "SPO2-001 · Online"}
              </span>
            </div>

            {stage === "waiting" ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-[#CCE2F7] bg-[#F8FAFD] p-6 text-sm text-[#5A7799]">
                <LoaderCircle size={18} className="animate-spin text-[#2F78C8]" />
                <span>Đang chờ dữ liệu SpO₂ từ cảm biến...</span>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Custom SpO2 Stepper / Input Control */}
                  <div className="inline-flex items-center rounded-2xl border border-[#CCE2F7] bg-[#F8FAFD] p-1.5 shadow-xs transition focus-within:border-[#2F78C8] focus-within:ring-2 focus-within:ring-[#D9EAFB]">
                    <button
                      type="button"
                      aria-label="Giảm SpO2"
                      onClick={() => setSpo2((v) => Math.max(70, v - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#5A7799] shadow-xs transition hover:bg-[#E7F1FB] hover:text-[#2F78C8] active:scale-95"
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>

                    <div className="flex items-baseline px-3">
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={spo2}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          setSpo2(val);
                        }}
                        onBlur={() => {
                          setSpo2((v) => Math.min(100, Math.max(70, v || 92)));
                        }}
                        className={`w-14 bg-transparent text-center font-mono text-3xl font-extrabold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${spo2 < 90 ? "text-red-500" : "text-[#2F78C8]"
                          }`}
                      />
                      <span className="font-bold text-sm text-[#5A7799]">%</span>
                    </div>

                    <button
                      type="button"
                      aria-label="Tăng SpO2"
                      onClick={() => setSpo2((v) => Math.min(100, v + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#5A7799] shadow-xs transition hover:bg-[#E7F1FB] hover:text-[#2F78C8] active:scale-95"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${spo2 < 90
                        ? "border border-red-200 bg-red-50 text-red-600"
                        : "border border-[#CCE2F7] bg-[#EAF4FD] text-[#2F78C8]"
                      }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${spo2 < 90 ? "bg-red-500 animate-pulse" : "bg-[#2F78C8]"
                        }`}
                    />
                    {spo2 < 90 ? "Thấp (< 90%)" : "Bình thường (≥ 90%)"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#5A7799]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Vừa cập nhật từ cảm biến SPO2-001</span>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Bản ghi âm phổi */}
          <section className="card overflow-hidden">
            <div className="border-b border-[#E7F1FB] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <Stethoscope size={17} className="text-[#2F78C8]" />
                    Âm phổi
                  </h2>
                  <p className="mt-1 text-xs text-[#5A7799]">
                    Một lần khám nhận duy nhất một bản ghi hoàn chỉnh từ ống nghe số.
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#F4F8FD] px-2 py-1 text-[10px] font-bold text-[#5A7799]">
                  STETHO-001 · Đã kết nối
                </span>
              </div>
            </div>

            {/* STATE 1: Waiting */}
            {stage === "waiting" && (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F4F8FD] text-[#2F78C8]">
                  <Stethoscope size={30} />
                </span>
                <h3 className="text-base font-bold text-[#173A5E]">
                  Đang chờ bản ghi từ ống nghe...
                </h3>
                <p className="mt-2 max-w-md text-xs leading-5 text-[#5A7799]">
                  Ống nghe tự động ghi dữ liệu trong quá trình khám. Bản ghi sẽ được đồng bộ sau khi phiên ghi hoàn tất.
                </p>
                <button
                  type="button"
                  onClick={startReceiving}
                  className="btn-primary mt-6 text-xs"
                >
                  Mô phỏng ống nghe gửi bản ghi
                </button>
              </div>
            )}

            {/* STATE 2: Receiving */}
            {stage === "receiving" && (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4FD] text-[#2F78C8]">
                  <Waves size={30} className="animate-pulse" />
                </span>
                <h3 className="text-base font-bold text-[#173A5E]">
                  Đang nhận bản ghi âm...
                </h3>
                <p className="mt-2 max-w-md text-xs leading-5 text-[#5A7799]">
                  Đang truyền bản ghi hoàn chỉnh từ thiết bị. Vui lòng giữ kết nối ổn định.
                </p>
                <div className="mt-5 flex w-48 items-center gap-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E1ECF7]">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-[#2F78C8]" />
                  </div>
                </div>
              </div>
            )}

            {/* STATE 3: Received */}
            {stage === "received" && (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4FD] text-[#2F78C8]">
                  <CircleCheck size={30} />
                </span>
                <h3 className="text-base font-bold text-[#173A5E]">
                  Đã nhận bản ghi
                </h3>
                <p className="mt-2 text-sm font-extrabold text-[#2F78C8]">
                  {DURATION_SECONDS} giây
                </p>
                <p className="mt-2 text-xs text-[#5A7799]">
                  Tự động chuyển sang phân tích AI...
                </p>
              </div>
            )}

            {/* STATE 3b: Analyzing AI */}
            {stage === "analyzing" && (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4FD] text-[#2F78C8]">
                  <LoaderCircle size={30} className="animate-spin" />
                </span>
                <h3 className="text-base font-bold text-[#173A5E]">
                  Đang phân tích AI...
                </h3>
                <p className="mt-2 max-w-md text-xs leading-5 text-[#5A7799]">
                  RespiSense Core đang tách respiratory cycles và nhận diện âm phổi từng chu kỳ...
                </p>
              </div>
            )}

            {/* STATE 4: AI Result Ready (and review / confirmed) */}
            {results && (
              <div className="p-5 space-y-6">
                {/* Shared Lung Sound Waveform Component */}
                <LungSoundWaveformCard
                  ref={waveformRef}
                  showCardWrapper={false}
                  audioUrl="/audio/REC-001.wav"
                  cycles={currentCycles}
                  duration={DURATION_SECONDS}
                  onCyclePlaybackChange={handleCyclePlaybackChange}
                />

                {/* Chi tiết từng chu kỳ hô hấp */}
                <div className="border-t border-[#E7F1FB] pt-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-base font-extrabold text-[#173A5E] sm:text-lg">
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
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-[#CFE2F5] px-4 py-2 text-sm font-bold text-[#2F78C8] transition-colors hover:bg-[#F2F7FD]"
                      >
                        <Pencil size={16} />
                        Chỉnh sửa
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-[#E1ECF7]">
                    {INITIAL_CYCLES.map((cycle, index) => {
                      const isPlaying = playingCycleId === cycle.id;
                      const activeClass = editing ? draftClasses[index] : classes[index];
                      const startText =
                        cycle.start % 1 === 0 ? `${cycle.start.toFixed(0)}s` : `${cycle.start}s`;
                      const endText =
                        cycle.end % 1 === 0 ? `${cycle.end.toFixed(0)}s` : `${cycle.end}s`;

                      return (
                        <div
                          key={cycle.id}
                          className="grid items-center gap-3 py-4 text-sm md:grid-cols-[110px_130px_minmax(220px,1fr)_150px]"
                        >
                          <b className="text-[#173A5E]">
                            Chu kỳ {String(cycle.number).padStart(2, "0")}
                          </b>
                          <span className="font-mono text-[#8BBCEC]">
                            {startText} – {endText}
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
                                    classification: activeClass,
                                  })
                              }
                              className={`flex w-[138px] items-center gap-2 font-semibold transition-colors ${isPlaying
                                  ? "text-[#2F78C8]"
                                  : "text-[#5A7799] hover:text-[#2F78C8]"
                                }`}
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
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Panel: Patient info, Summary & Doctor Confirmation */}
        <aside className="space-y-5">
          {/* Patient info */}
          <section className="card p-5">
            <h2 className="text-sm font-bold">Thông tin bệnh nhân</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#5A7799]">Mã bệnh nhân</dt>
                <dd className="font-bold">{patient.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#5A7799]">Tuổi / Giới tính</dt>
                <dd className="font-bold">
                  {patient.age} / {patient.gender}
                </dd>
              </div>
              <div className="border-t border-[#E7F1FB] pt-3">
                <dt className="text-[#5A7799]">Chẩn đoán nền</dt>
                <dd className="mt-1 font-bold">{patient.diagnosis}</dd>
                <dd className="text-[10px] italic text-[#9EC9F3]">
                  Do bác sĩ ghi nhận
                </dd>
              </div>
            </dl>
          </section>

          {/* Visit summary */}
          <section className="card p-5">
            <h2 className="text-sm font-bold">Tóm tắt lần khám</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#5A7799]">SpO₂</dt>
                <dd className="font-bold">
                  {stage === "waiting"
                    ? "Đang chờ dữ liệu..."
                    : `${spo2}% (${spo2 < 90 ? "Thấp" : "Bình thường"})`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#5A7799]">Bản ghi âm</dt>
                <dd className="font-bold">
                  {stage === "waiting" || stage === "receiving"
                    ? "Đang chờ..."
                    : `Đã nhận (${DURATION_SECONDS}s)`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#5A7799]">Chu kỳ hô hấp</dt>
                <dd className="font-bold">
                  {results ? `${INITIAL_CYCLES.length} chu kỳ` : "Chưa phân tích"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[#E7F1FB] pt-3">
                <dt className="text-[#5A7799]">Trạng thái AI</dt>
                <dd className="font-bold text-[#2F78C8]">
                  {stage === "waiting"
                    ? "Đang chờ bản ghi"
                    : stage === "receiving"
                      ? "Đang nhận dữ liệu"
                      : stage === "received"
                        ? "Đã nhận bản ghi"
                        : stage === "analyzing"
                          ? "Đang phân tích AI"
                          : stage === "ready"
                            ? "Chờ bác sĩ xác nhận"
                            : stage === "review"
                              ? "Đang bác sĩ review"
                              : "Đã xác nhận"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Clinical note & confirmation */}
          <section className="card p-5">
            <h2 className="text-sm font-bold">Ghi chú lần khám</h2>
            <p className="mt-1 text-[10px] text-[#5A7799]">
              Nhập nhận định liên quan đến SpO₂, kết quả âm phổi và lưu ý theo dõi.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={stage === "confirmed"}
              className="field mt-4 min-h-28 text-xs leading-relaxed"
              placeholder="VD: SpO₂ duy trì 92%. Âm phổi ghi nhận tiếng rít nhẹ và ran nổ thưa thớt, cần theo dõi sát..."
            />
            {results && stage !== "confirmed" && (
              <button
                type="button"
                onClick={saveEditing}
                className="btn-primary mt-3 w-full text-xs font-bold"
              >
                <Save size={14} />
                Xác nhận kết quả
              </button>
            )}
            {stage === "confirmed" && (
              <div className="mt-3 rounded-xl bg-[#E7F1FB] p-3 text-xs font-bold text-[#2F78C8]">
                <CircleCheck size={15} className="mr-1 inline" />
                Đã xác nhận bởi bác sĩ
              </div>
            )}
          </section>

          {/* Complete visit */}
          {stage === "confirmed" && (
            <button
              type="button"
              onClick={finish}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-md"
            >
              Hoàn tất lần khám
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
