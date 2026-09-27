"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { patients } from "@/constants/mock-data";

export function StartVisitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const results = useMemo(
    () =>
      patients.filter((p) =>
        `${p.name} ${p.code} ${p.phone}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  if (!open) return null;
  const choose = (id: string) => router.push(`/patients/${id}/visits/new`);
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E7F1FB] p-5">
          <div>
            <h2 className="font-bold text-[#173A5E]">Bắt đầu khám</h2>
            <p className="mt-1 text-xs text-[#5A7799]">
              Chọn bệnh nhân cũ hoặc thêm hồ sơ bệnh nhân mới
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#5A7799] hover:bg-[#F4F8FD]"
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
                onChange={(e) => setQuery(e.target.value)}
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
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choose(p.id)}
                  className="flex w-full items-center justify-between px-2 py-3 text-left hover:bg-[#F4F8FD]"
                >
                  <span>
                    <strong className="block text-sm text-[#173A5E]">
                      {p.name}
                    </strong>
                    <span className="text-[11px] text-[#5A7799]">
                      {p.code} · {p.age} tuổi · {p.gender}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#2F78C8]">
                    Chọn
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              choose("PAT-NEW");
            }}
            className="space-y-4 p-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
                Họ và tên
                <input
                  required
                  className="field mt-1"
                  placeholder="Nhập họ và tên"
                />
              </label>
              <label className="text-xs font-semibold text-[#5A7799]">
                Ngày sinh
                <input required type="date" className="field mt-1" />
              </label>
              <label className="text-xs font-semibold text-[#5A7799]">
                Giới tính
                <select className="field mt-1">
                  <option>Nam</option>
                  <option>Nữ</option>
                </select>
              </label>
              <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
                Số điện thoại
                <input className="field mt-1" placeholder="090..." />
              </label>
              <label className="col-span-2 text-xs font-semibold text-[#5A7799]">
                Chẩn đoán nền{" "}
                <em className="font-normal">(do bác sĩ ghi nhận)</em>
                <input className="field mt-1" placeholder="Ví dụ: COPD" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="btn-secondary"
              >
                Quay lại
              </button>
              <button className="btn-primary">Tạo hồ sơ & khám</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
