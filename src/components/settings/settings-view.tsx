"use client";
import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { doctor } from "@/constants/mock-data";
import { PageHeader } from "@/components/ui/page-header";

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [checks, setChecks] = useState([true, true, true, true]);

  // Change password states
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw) {
      setPwError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }
    setPwError("");
    setPwSuccess(true);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setTimeout(() => setPwSuccess(false), 3000);
  };

  return (
    <div className="page max-w-4xl space-y-6">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Quản lý tài khoản bác sĩ và cấu hình cảnh báo lâm sàng"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
        }}
        className="card space-y-5 p-6"
      >
        <h2 className="text-sm font-bold">Thông tin bác sĩ</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Họ và tên bác sĩ", doctor.name, "text"],
            ["Chức danh chuyên môn", "Bác sĩ chuyên khoa Hô hấp", "text"],
            ["Chuyên khoa", doctor.department, "text"],
            ["Email làm việc", doctor.email, "email"],
          ].map(([label, value, type]) => (
            <label key={label} className="text-xs font-bold text-[#5A7799]">
              {label}
              <input type={type} defaultValue={value} className="field mt-1" />
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">
            {saved && <Check size={14} />} {saved ? "Đã lưu" : "Lưu thông tin"}
          </button>
        </div>
      </form>

      {/* Đổi mật khẩu */}
      <form
        onSubmit={handlePasswordSubmit}
        className="card space-y-5 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Đổi mật khẩu</h2>
            <p className="mt-1 text-xs text-[#5A7799]">
              Cập nhật mật khẩu để bảo mật tài khoản bác sĩ và dữ liệu bệnh nhân
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F1FB] text-[#2F78C8]">
            <KeyRound size={17} />
          </span>
        </div>

        {pwError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
            {pwError}
          </div>
        )}

        {pwSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            <Check size={15} className="text-emerald-600" />
            <span>Đã cập nhật mật khẩu mới thành công!</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-bold text-[#5A7799]">
            Mật khẩu hiện tại
            <div className="relative mt-1">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => {
                  setCurrentPw(e.target.value);
                  setPwError("");
                }}
                placeholder="••••••••"
                className="field !pr-10 text-xs"
                style={{ paddingRight: "2.5rem" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#2F78C8]"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <label className="text-xs font-bold text-[#5A7799]">
            Mật khẩu mới
            <div className="relative mt-1">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => {
                  setNewPw(e.target.value);
                  setPwError("");
                }}
                placeholder="Tối thiểu 6 ký tự"
                className="field !pr-10 text-xs"
                style={{ paddingRight: "2.5rem" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#2F78C8]"
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <label className="text-xs font-bold text-[#5A7799]">
            Xác nhận mật khẩu mới
            <div className="relative mt-1">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => {
                  setConfirmPw(e.target.value);
                  setPwError("");
                }}
                placeholder="Nhập lại mật khẩu mới"
                className="field !pr-10 text-xs"
                style={{ paddingRight: "2.5rem" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#2F78C8]"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            {pwSuccess ? "Đã cập nhật" : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
      <section className="card p-6">
        <h2 className="text-sm font-bold">Cấu hình thông báo lâm sàng</h2>
        <div className="mt-4 divide-y divide-[#E7F1FB]">
          {[
            [
              "SpO₂ thấp (< 90%)",
              "Cảnh báo ngay khi phát hiện tình trạng giảm oxy máu",
            ],
            [
              "Âm phổi bất thường",
              "Thông báo khi AI phát hiện Crackles, Wheezes hoặc kết hợp",
            ],
            [
              "Bản ghi chờ xác nhận",
              "Nhắc khi có bản ghi hoàn chỉnh mới từ ống nghe số",
            ],
            [
              "Thiết bị mất kết nối",
              "Cảnh báo khi cảm biến SpO₂ hoặc ống nghe ngắt kết nối",
            ],
          ].map(([title, desc], i) => (
            <label
              key={title}
              className="flex cursor-pointer items-center justify-between gap-4 py-3"
            >
              <span>
                <b className="block text-xs">{title}</b>
                <small className="text-[#5A7799]">{desc}</small>
              </span>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={(e) =>
                  setChecks((v) =>
                    v.map((x, j) => (j === i ? e.target.checked : x)),
                  )
                }
                className="h-4 w-4 accent-[#2F78C8]"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
