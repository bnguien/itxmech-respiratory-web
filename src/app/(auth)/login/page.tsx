"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { createClient } from "@/lib/supabase/client";

function getSafeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState(() =>
    searchParams.get("error") === "recovery"
      ? "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới."
      : "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError = !email.trim()
    ? "Vui lòng nhập email."
    : !/^\S+@\S+\.\S+$/.test(email.trim())
      ? "Email không đúng định dạng."
      : "";
  const passwordError = !password ? "Vui lòng nhập mật khẩu." : "";

  const visibleError = errorMessage || recoveryError;

  useEffect(() => {
    if (searchParams.get("error") === "recovery") {
      router.replace("/login");
    }
  }, [router, searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    setTouched({ email: true, password: true });
    if (emailError || passwordError) return;

    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage("Email hoặc mật khẩu không chính xác.");
      setIsLoading(false);
      return;
    }

    router.replace(getSafeNextPath());
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E7F1FB] p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#9EC9F3]/30 bg-white p-8 shadow-[0_20px_50px_rgba(23,58,94,.07)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand />
          <p className="text-xs text-[#5A7799]">
            Hệ thống AIoT hỗ trợ theo dõi hô hấp
          </p>
        </div>
        {visibleError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-600"
          >
            {visibleError}
          </div>
        )}
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-[#5A7799]">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              aria-invalid={touched.email && Boolean(emailError)}
              aria-describedby={touched.email && emailError ? "login-email-error" : undefined}
              className={`field mt-1 ${touched.email && emailError ? "border-red-400 focus:border-red-500" : ""}`}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
                setRecoveryError("");
              }}
              onBlur={() => setTouched((value) => ({ ...value, email: true }))}
            />
            {touched.email && emailError && (
              <span id="login-email-error" role="alert" className="mt-1 block text-xs font-medium text-red-600">
                {emailError}
              </span>
            )}
          </label>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A7799]">
                Mật khẩu
              </span>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#2F78C8] hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                aria-invalid={touched.password && Boolean(passwordError)}
                aria-describedby={touched.password && passwordError ? "login-password-error" : undefined}
                className={`field !pr-10 ${touched.password && passwordError ? "border-red-400 focus:border-red-500" : ""}`}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                  setRecoveryError("");
                }}
                onBlur={() => setTouched((value) => ({ ...value, password: true }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A7799] transition hover:text-[#2F78C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F78C8]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && passwordError && (
              <span id="login-password-error" role="alert" className="mt-1 block text-xs font-medium text-red-600">
                {passwordError}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
            {!isLoading && <ArrowRight size={15} />}
          </button>
        </form>
        <div className="flex items-center justify-center gap-2 border-t border-[#E7F1FB] pt-5 text-[11px] text-[#5A7799]">
          <ShieldCheck size={14} className="text-[#2F78C8]" />
          Bảo mật dữ liệu y tế theo tiêu chuẩn lâm sàng
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
