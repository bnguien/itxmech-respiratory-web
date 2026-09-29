"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui/brand";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const isMatching = newPassword !== "" && newPassword === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!hasMinLength) {
      setErrorMsg("Mật khẩu phải có tối thiểu 8 ký tự.");
      return;
    }
    if (!hasNumber) {
      setErrorMsg("Mật khẩu phải chứa ít nhất 1 chữ số.");
      return;
    }
    if (!isMatching) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    // Simulate updating password
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 800);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E7F1FB] p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#9EC9F3]/30 bg-white p-8 shadow-[0_20px_50px_rgba(23,58,94,.07)]">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand />
          <p className="text-xs text-[#5A7799]">
            Hệ thống AIoT hỗ trợ theo dõi hô hấp
          </p>
        </div>

        {!isSuccess ? (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-lg font-extrabold text-[#173A5E]">
                Đặt lại mật khẩu mới
              </h1>
              <p className="text-xs text-[#5A7799] leading-relaxed">
                Tạo mật khẩu an toàn mới để bảo vệ tài khoản và dữ liệu bệnh nhân.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <label className="block text-xs font-semibold text-[#5A7799]">
                Mật khẩu mới
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="field field-has-icon-left field-has-icon-right !pl-10.5 !pr-10.5"
                    style={{ paddingLeft: "2.6rem", paddingRight: "2.6rem" }}
                  />
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#173A5E]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {/* Confirm Password */}
              <label className="block text-xs font-semibold text-[#5A7799]">
                Xác nhận mật khẩu mới
                <div className="relative mt-1">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="field field-has-icon-left field-has-icon-right !pl-10.5 !pr-10.5"
                    style={{ paddingLeft: "2.6rem", paddingRight: "2.6rem" }}
                  />
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A7799] hover:text-[#173A5E]"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {/* Password Requirements Checklist */}
              <div className="space-y-1.5 rounded-xl bg-[#F8FAFC] border border-[#E7F1FB] p-3 text-[11px]">
                <span className="block font-bold text-[#173A5E]">Yêu cầu mật khẩu:</span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? "bg-emerald-500" : "bg-[#9EC9F3]"
                      }`}
                  />
                  <span className={hasMinLength ? "text-emerald-600 font-semibold" : "text-[#5A7799]"}>
                    Tối thiểu 8 ký tự
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${hasNumber ? "bg-emerald-500" : "bg-[#9EC9F3]"
                      }`}
                  />
                  <span className={hasNumber ? "text-emerald-600 font-semibold" : "text-[#5A7799]"}>
                    Chứa ít nhất 1 chữ số (0-9)
                  </span>
                </div>
                {confirmPassword && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${isMatching ? "bg-emerald-500" : "bg-red-500"
                        }`}
                    />
                    <span className={isMatching ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                      {isMatching ? "Mật khẩu xác nhận trùng khớp" : "Mật khẩu xác nhận chưa khớp"}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <span>Đang cập nhật...</span>
                ) : (
                  <>
                    <span>Cập nhật mật khẩu</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 size={30} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-extrabold text-[#173A5E]">
                Đặt lại mật khẩu thành công!
              </h2>
              <p className="text-xs text-[#5A7799] leading-relaxed">
                Mật khẩu của bạn đã được thay đổi an toàn. Bạn có thể sử dụng mật khẩu mới này để đăng nhập vào hệ thống.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        )}

        {/* Back to Login link */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F78C8] hover:underline"
          >
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 border-t border-[#E7F1FB] pt-5 text-[11px] text-[#5A7799]">
          <ShieldCheck size={14} className="text-[#2F78C8]" />
          Bảo mật dữ liệu y tế theo tiêu chuẩn lâm sàng
        </div>
      </div>
    </main>
  );
}
