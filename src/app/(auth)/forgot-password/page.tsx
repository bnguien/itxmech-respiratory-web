"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { doctor } from "@/constants/mock-data";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(doctor.email);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate sending reset email
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 700);
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

        {!isSubmitted ? (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-lg font-extrabold text-[#173A5E]">
                Quên mật khẩu?
              </h1>
              <p className="text-xs text-[#5A7799] leading-relaxed">
                Nhập địa chỉ email tài khoản bác sĩ của bạn. Chúng tôi sẽ gửi hướng dẫn và liên kết để đặt lại mật khẩu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-semibold text-[#5A7799]">
                Email tài khoản
                <div className="relative mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bacsi@respicare.med.vn"
                    className="field field-has-icon-left !pl-10.5"
                    style={{ paddingLeft: "2.6rem" }}
                  />
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <span>Đang gửi hướng dẫn...</span>
                ) : (
                  <>
                    <span>Gửi liên kết đặt lại</span>
                    <ArrowRight size={15} />
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
                Đã gửi email khôi phục!
              </h2>
              <p className="text-xs text-[#5A7799] leading-relaxed">
                Chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến địa chỉ{" "}
                <b className="font-semibold text-[#173A5E]">{email}</b>. Vui lòng kiểm tra hộp thư (cả thư mục Spam).
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/reset-password"
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Tiếp tục đến trang đặt lại mật khẩu
              </Link>
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
