"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  X,
} from "lucide-react";
import { doctor } from "@/constants/mock-data";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  name: string;
  completed: boolean;
}

const INITIAL_EVENTS: Record<string, ScheduleItem[]> = {
  "2026-09-25": [
    {
      id: "ev-0",
      time: "09:00",
      title: "Khám ban đầu & phân tích thở rít",
      name: "Đỗ Hữu Trí",
      completed: true,
    },
  ],
  "2026-09-27": [
    {
      id: "ev-1",
      time: "08:30",
      title: "Đo lại SpO₂ & theo dõi",
      name: "Trần Văn Mạnh",
      completed: true,
    },
    {
      id: "ev-2",
      time: "10:15",
      title: "Kiểm tra bản ghi âm phổi",
      name: "Phạm Đức Thành",
      completed: true,
    },
    {
      id: "ev-3",
      time: "14:30",
      title: "Review kết quả AI Crackles",
      name: "Đỗ Hữu Trí",
      completed: false,
    },
  ],
  "2026-09-28": [
    {
      id: "ev-4",
      time: "09:00",
      title: "Khám định kỳ & đo SpO₂",
      name: "Nguyễn Thị Lan",
      completed: false,
    },
    {
      id: "ev-5",
      time: "15:30",
      title: "Hội chẩn ca COPD tiến triển",
      name: "BS. Lê Quang Hải",
      completed: false,
    },
  ],
  "2026-09-29": [
    {
      id: "ev-6",
      time: "08:00",
      title: "Ghi âm phổi sau khí dung",
      name: "Hoàng Văn Nam",
      completed: false,
    },
    {
      id: "ev-7",
      time: "10:30",
      title: "Đánh giá hiệu quả thở oxy",
      name: "Trần Văn Mạnh",
      completed: false,
    },
  ],
  "2026-09-30": [
    {
      id: "ev-8",
      time: "09:30",
      title: "Kiểm tra cảm biến SpO₂ đeo tay",
      name: "Vũ Thị Mai",
      completed: false,
    },
  ],
  "2026-10-02": [
    {
      id: "ev-9",
      time: "08:15",
      title: "Khám hô hấp chuyên sâu",
      name: "Phạm Đức Thành",
      completed: false,
    },
  ],
  "2026-10-05": [
    {
      id: "ev-10",
      time: "14:00",
      title: "Đánh giá lại kết quả phân loại âm phổi",
      name: "Đỗ Hữu Trí",
      completed: false,
    },
  ],
};

const VIETNAMESE_DAYS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DoctorPanel() {
  // Default date in mock system is September 27, 2026
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 8, 27));
  const [viewDate, setViewDate] = useState<Date>(new Date(2026, 8, 1));
  const [events, setEvents] = useState<Record<string, ScheduleItem[]>>(INITIAL_EVENTS);
  const [isAdding, setIsAdding] = useState(false);
  const [newTime, setNewTime] = useState("09:00");
  const [newTitle, setNewTitle] = useState("");
  const [newName, setNewName] = useState("");

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date(2026, 8, 27);
    setSelectedDate(today);
    setViewDate(new Date(2026, 8, 1));
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (
      date.getMonth() !== viewDate.getMonth() ||
      date.getFullYear() !== viewDate.getFullYear()
    ) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const calendarCells = useMemo(() => {
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDow = new Date(currentYear, currentMonth, 1).getDay();
    // Monday is index 0 in [T2..CN]
    const startOffset = (firstDow + 6) % 7;

    const prevCells = Array.from({ length: startOffset }, (_, index) => {
      const day = daysInPrevMonth - startOffset + index + 1;
      return {
        day,
        date: new Date(currentYear, currentMonth - 1, day),
        isCurrentMonth: false,
      };
    });

    const currentCells = Array.from({ length: daysInCurrentMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        date: new Date(currentYear, currentMonth, day),
        isCurrentMonth: true,
      };
    });

    const total = prevCells.length + currentCells.length;
    const remainder = total % 7;
    const trailingCount = remainder === 0 ? 0 : 7 - remainder;

    const nextCells = Array.from({ length: trailingCount }, (_, index) => {
      const day = index + 1;
      return {
        day,
        date: new Date(currentYear, currentMonth + 1, day),
        isCurrentMonth: false,
      };
    });

    return [...prevCells, ...currentCells, ...nextCells];
  }, [currentYear, currentMonth]);

  const selectedKey = getDateKey(selectedDate);
  const selectedEvents = events[selectedKey] || [];

  const handleToggleCompleted = (eventId: string) => {
    setEvents((prev) => {
      const currentList = prev[selectedKey] || [];
      return {
        ...prev,
        [selectedKey]: currentList.map((item) =>
          item.id === eventId ? { ...item, completed: !item.completed } : item
        ),
      };
    });
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ScheduleItem = {
      id: `ev-${Date.now()}`,
      time: newTime || "09:00",
      title: newTitle.trim(),
      name: newName.trim() || "Bệnh nhân theo dõi",
      completed: false,
    };

    setEvents((prev) => ({
      ...prev,
      [selectedKey]: [...(prev[selectedKey] || []), newItem],
    }));

    setNewTitle("");
    setNewName("");
    setIsAdding(false);
  };

  const isViewingCurrentDateMonth =
    viewDate.getFullYear() === 2026 && viewDate.getMonth() === 8;

  return (
    <aside className="hidden h-full w-80 shrink-0 overflow-y-auto border-l border-[#E7F1FB] bg-white p-6 xl:block">
      <section className="border-b border-[#E7F1FB] pb-6">
        <h2 className="text-sm font-bold">Hồ sơ bác sĩ</h2>
        <div className="mt-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#173A5E] via-[#2F78C8] to-[#9EC9F3] p-[3px] shadow-[0_8px_24px_rgba(47,120,200,.25)]">
            <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-[#E7F1FB] text-lg font-extrabold text-[#2F78C8]">
              BN
            </span>
          </div>
          <h3 className="mt-3 text-base font-extrabold">{doctor.name}</h3>
          <p className="mt-1 text-xs text-[#5A7799]">
            Bác sĩ chuyên khoa Hô hấp
          </p>
          <span className="mt-2 inline-block rounded-full border border-[#9EC9F3]/40 bg-[#E7F1FB] px-2.5 py-1 text-[10px] font-bold text-[#2F78C8]">
            {doctor.department}
          </span>
        </div>
      </section>

      <section className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#173A5E]">
              Lịch làm việc
            </h2>
            <p className="mt-1 text-sm font-bold text-[#2F78C8]">
              Tháng {currentMonth + 1} {currentYear}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {!isViewingCurrentDateMonth && (
              <button
                type="button"
                onClick={handleGoToToday}
                title="Về tháng hiện tại (Tháng 9/2026)"
                className="rounded-lg border border-[#CCE2F7] bg-[#F4F8FD] px-2 py-1 text-[10px] font-bold text-[#2F78C8] transition hover:bg-[#E7F1FB]"
              >
                Hôm nay
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Tháng trước"
              aria-label="Tháng trước"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E7F1FB] text-[#5A7799] transition hover:border-[#CCE2F7] hover:bg-[#F4F8FD] hover:text-[#2F78C8]"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Tháng sau"
              aria-label="Tháng sau"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E7F1FB] text-[#5A7799] transition hover:border-[#CCE2F7] hover:bg-[#F4F8FD] hover:text-[#2F78C8]"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#5A7799]">
          {WEEK_DAYS.map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Days grid */}
        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[11px]">
          {calendarCells.map((cell, index) => {
            const isSelected =
              cell.date.getFullYear() === selectedDate.getFullYear() &&
              cell.date.getMonth() === selectedDate.getMonth() &&
              cell.date.getDate() === selectedDate.getDate();

            const isToday =
              cell.date.getFullYear() === 2026 &&
              cell.date.getMonth() === 8 &&
              cell.date.getDate() === 27;

            const cellKey = getDateKey(cell.date);
            const hasEvent = (events[cellKey] || []).length > 0;

            return (
              <button
                key={`${cellKey}-${index}`}
                type="button"
                onClick={() => handleSelectDate(cell.date)}
                className={`group relative flex h-8 items-center justify-center rounded-lg font-medium transition ${isSelected
                    ? "bg-[#2F78C8] font-bold text-white shadow-sm"
                    : isToday
                      ? "border border-[#2F78C8] font-bold text-[#2F78C8] hover:bg-[#EAF4FD]"
                      : cell.isCurrentMonth
                        ? "text-[#173A5E] hover:bg-[#F4F8FD]"
                        : "text-[#B9CFE6] hover:bg-[#F4F8FD]/60"
                  }`}
              >
                <span>{cell.day}</span>
                {hasEvent && (
                  <span
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-[#2F78C8]"
                      }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule for selected date */}
        <div className="mt-6 flex items-center justify-between border-t border-[#E7F1FB] pt-4">
          <div>
            <h3 className="text-xs font-bold text-[#173A5E]">
              {VIETNAMESE_DAYS[selectedDate.getDay()]},{" "}
              {String(selectedDate.getDate()).padStart(2, "0")}/
              {String(selectedDate.getMonth() + 1).padStart(2, "0")}
            </h3>
            <span className="text-[10px] text-[#5A7799]">
              {selectedEvents.length} lịch làm việc
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            title={isAdding ? "Đóng form" : "Thêm lịch mới"}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F1FB] text-[#2F78C8] transition hover:bg-[#D4E8FB]"
          >
            {isAdding ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {/* Add event form */}
        {isAdding && (
          <form
            onSubmit={handleAddEvent}
            className="mt-3 space-y-2.5 rounded-2xl border border-[#CCE2F7] bg-[#F4F8FD] p-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2F78C8]">Thêm lịch làm việc</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[#5A7799] hover:text-[#173A5E]"
              >
                <X size={13} />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5A7799]">
                Giờ
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[#CCE2F7] bg-white px-2.5 py-1.5 text-xs text-[#173A5E] outline-none focus:border-[#2F78C8]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5A7799]">
                Nội dung công việc
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Kiểm tra SpO₂ & âm phổi..."
                required
                className="mt-1 w-full rounded-lg border border-[#CCE2F7] bg-white px-2.5 py-1.5 text-xs text-[#173A5E] outline-none focus:border-[#2F78C8]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5A7799]">
                Tên bệnh nhân / Ghi chú
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Trần Văn Mạnh"
                className="mt-1 w-full rounded-lg border border-[#CCE2F7] bg-white px-2.5 py-1.5 text-xs text-[#173A5E] outline-none focus:border-[#2F78C8]"
              />
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#5A7799] hover:bg-[#E7F1FB]"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-primary rounded-lg px-3 py-1 text-[11px]"
              >
                Lưu lịch
              </button>
            </div>
          </form>
        )}

        {/* Events list */}
        <div className="mt-3 space-y-2">
          {selectedEvents.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleCompleted(item.id)}
              className={`group flex cursor-pointer items-start justify-between rounded-xl border p-3 transition ${item.completed
                  ? "border-[#E1ECF7] bg-[#FAFBFD] opacity-80"
                  : "border-[#E7F1FB] bg-white hover:border-[#CCE2F7] hover:bg-[#F9FCFF]"
                }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#2F78C8]">
                  <Clock size={11} />
                  <span>{item.time}</span>
                  {item.completed && (
                    <span className="rounded bg-[#EAF4FD] px-1.5 py-0.5 text-[9px] font-bold text-[#2F78C8]">
                      Hoàn thành
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 truncate text-[11px] font-bold leading-4 ${item.completed
                      ? "text-[#8CA4BE] line-through"
                      : "text-[#173A5E]"
                    }`}
                >
                  {item.title}
                </p>
                <small className="mt-0.5 block truncate text-[10px] text-[#5A7799]">
                  {item.name}
                </small>
              </div>
              <button
                type="button"
                title={item.completed ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCompleted(item.id);
                }}
                className={`ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${item.completed
                    ? "border-[#2F78C8] bg-[#2F78C8] text-white"
                    : "border-[#CCE2F7] text-transparent hover:border-[#2F78C8] hover:text-[#2F78C8]"
                  }`}
              >
                <Check size={12} strokeWidth={3} />
              </button>
            </div>
          ))}

          {selectedEvents.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#CCE2F7] p-5 text-center">
              <CalendarIcon size={20} className="mx-auto text-[#9EC9F3]" />
              <p className="mt-2 text-xs font-semibold text-[#5A7799]">
                Chưa có lịch trong ngày này
              </p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="mt-2 text-[11px] font-bold text-[#2F78C8] hover:underline"
              >
                + Thêm lịch làm việc
              </button>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
