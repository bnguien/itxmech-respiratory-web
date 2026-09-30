"use client";
import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useDoctorProfile } from "@/components/auth/doctor-profile-context";
import { createClient } from "@/lib/supabase/client";

export function SettingsView() {
  const { email, profile, setProfile } = useDoctorProfile();
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [professionalTitle, setProfessionalTitle] = useState(
    profile?.professional_title ?? "",
  );
  const [specialty, setSpecialty] = useState(profile?.specialty ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const currentPwError = !currentPw ? "Vui lòng nhập mật khẩu hiện tại." : "";
  const newPwError = !newPw
    ? "Vui lòng nhập mật khẩu mới."
    : newPw.length < 8
      ? "Mật khẩu mới phải có ít nhất 8 ký tự."
      : !/\d/.test(newPw)
        ? "Mật khẩu mới phải chứa ít nhất 1 chữ số."
        : newPw === currentPw
          ? "Mật khẩu mới phải khác mật khẩu hiện tại."
          : "";
  const confirmPwError = !confirmPw
    ? "Vui lòng xác nhận mật khẩu mới."
    : confirmPw !== newPw
      ? "Mật khẩu xác nhận không khớp với mật khẩu mới."
      : "";

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");

    if (!profile) {
      setProfileError("Không tìm thấy hồ sơ bác sĩ. Vui lòng liên hệ quản trị viên.");
      return;
    }

    if (!fullName.trim()) {
      setProfileError("Vui lòng nhập họ và tên bác sĩ.");
      return;
    }

    setIsSavingProfile(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("doctor_profiles")
      .update({
        full_name: fullName.trim(),
        professional_title: professionalTitle.trim() || null,
        specialty: specialty.trim() || null,
        department: department.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select()
      .single();

    setIsSavingProfile(false);

    if (error || !data) {
      setProfileError("Không thể lưu hồ sơ bác sĩ. Vui lòng thử lại.");
      return;
    }

    setProfile(data);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(false);
    setPasswordTouched({ current: true, next: true, confirm: true });
    if (currentPwError || newPwError || confirmPwError) {
      setPwError("");
      return;
    }

    setPwError("");
    setIsChangingPassword(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });

    if (signInError) {
      setPwError("Mật khẩu hiện tại không chính xác.");
      setIsChangingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPw,
    });

    setIsChangingPassword(false);

    if (updateError) {
      setPwError("Không thể cập nhật mật khẩu. Vui lòng thử lại.");
      return;
    }

    setPwSuccess(true);
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPasswordTouched({ current: false, next: false, confirm: false });
    setTimeout(() => setPwSuccess(false), 3000);
  };

  return (
    <div className="page w-full space-y-6">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Quản lý tài khoản bác sĩ và cấu hình cảnh báo lâm sàng"
      />
      <form onSubmit={handleProfileSubmit} className="card space-y-5 p-6">
        <h2 className="text-sm font-bold">Thông tin bác sĩ</h2>
        {profileError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
            {profileError}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#5A7799]">
            Họ và tên bác sĩ
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="field mt-1" />
          </label>
          <label className="text-xs font-bold text-[#5A7799]">
            Chức danh chuyên môn
            <input value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} className="field mt-1" />
          </label>
          <label className="text-xs font-bold text-[#5A7799]">
            Chuyên khoa
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="field mt-1" />
          </label>
          <label className="text-xs font-bold text-[#5A7799]">
            Khoa / phòng ban
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className="field mt-1" />
          </label>
          <label className="text-xs font-bold text-[#5A7799] sm:col-span-2">
            Email làm việc
            <input type="email" value={email} readOnly className="field mt-1 cursor-not-allowed bg-[#F4F8FD]" />
          </label>
        </div>
        <div className="flex justify-end">
          <button disabled={isSavingProfile} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
            {saved && <Check size={14} />} {saved ? "Đã lưu" : isSavingProfile ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </form>

      {/* Đổi mật khẩu */}
      <form
        noValidate
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
                onBlur={() => setPasswordTouched((value) => ({ ...value, current: true }))}
                aria-invalid={passwordTouched.current && Boolean(currentPwError)}
                aria-describedby={passwordTouched.current && currentPwError ? "current-password-error" : undefined}
                placeholder="••••••••"
                className={`field !pr-10 text-xs ${passwordTouched.current && currentPwError ? "border-red-400 focus:border-red-500" : ""}`}
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
                aria-pressed={showCurrent}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#2F78C8]"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {passwordTouched.current && currentPwError && (
              <span id="current-password-error" role="alert" className="mt-1 block text-xs font-medium text-red-600">{currentPwError}</span>
            )}
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
                onBlur={() => setPasswordTouched((value) => ({ ...value, next: true }))}
                aria-invalid={passwordTouched.next && Boolean(newPwError)}
                aria-describedby={passwordTouched.next && newPwError ? "new-password-error" : undefined}
                placeholder="Tối thiểu 8 ký tự"
                className={`field !pr-10 text-xs ${passwordTouched.next && newPwError ? "border-red-400 focus:border-red-500" : ""}`}
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                aria-pressed={showNew}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#2F78C8]"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {passwordTouched.next && newPwError && (
              <span id="new-password-error" role="alert" className="mt-1 block text-xs font-medium text-red-600">{newPwError}</span>
            )}
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
                onBlur={() => setPasswordTouched((value) => ({ ...value, confirm: true }))}
                aria-invalid={passwordTouched.confirm && Boolean(confirmPwError)}
                aria-describedby={passwordTouched.confirm && confirmPwError ? "confirm-password-error" : undefined}
                placeholder="Nhập lại mật khẩu mới"
                className={`field !pr-10 text-xs ${passwordTouched.confirm && confirmPwError ? "border-red-400 focus:border-red-500" : ""}`}
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                aria-pressed={showConfirm}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#2F78C8]"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {passwordTouched.confirm && confirmPwError && (
              <span id="confirm-password-error" role="alert" className="mt-1 block text-xs font-medium text-red-600">{confirmPwError}</span>
            )}
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isChangingPassword} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
            {pwSuccess ? "Đã cập nhật" : isChangingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
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
