"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const emailError = !email.trim()
    ? "Vui lòng nhập email."
    : !/^\S+@\S+\.\S+$/.test(email.trim())
      ? "Email không đúng định dạng."
      : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setEmailTouched(true);
    if (emailError) return;
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(
        "Chưa thể gửi liên kết đặt lại mật khẩu. Vui lòng thử lại sau.",
      );
      return;
    }

    setIsLoading(false);
    setIsSubmitted(true);
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

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-600"
              >
                {errorMessage}
              </div>
            )}

            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-semibold text-[#5A7799]">
                Email tài khoản
                <div className="relative mt-1">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    aria-invalid={emailTouched && Boolean(emailError)}
                    aria-describedby={emailTouched && emailError ? "forgot-email-error" : undefined}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage("");
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="bacsi@respicare.med.vn"
                    className={`field field-has-icon-left !pl-10.5 ${emailTouched && emailError ? "border-red-400 focus:border-red-500" : ""}`}
                    style={{ paddingLeft: "2.6rem" }}
                  />
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
                  />
                </div>
                {emailTouched && emailError && (
                  <span id="forgot-email-error" role="alert" className="mt-1 block text-xs font-medium text-red-600">
                    {emailError}
                  </span>
                )}
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

            <p className="text-[11px] text-[#5A7799]">
              Liên kết trong email sẽ đưa bạn đến trang đặt lại mật khẩu an toàn.
            </p>
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
