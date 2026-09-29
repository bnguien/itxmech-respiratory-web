"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] p-4 text-center select-none">
      <div className="card w-full max-w-md p-6 sm:p-8 space-y-5 border-[#E7F1FB] shadow-md">
        {/* Warning Icon Badge */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/60 shadow-xs">
          <AlertTriangle size={28} />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-[#173A5E] sm:text-xl">
            Đã xảy ra lỗi không mong muốn
          </h2>
          <p className="text-xs text-[#5A7799] leading-relaxed">
            Hệ thống gặp sự cố trong quá trình xử lý dữ liệu. Bạn có thể bấm thử lại hoặc quay về trang chủ.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-[#9EC9F3] bg-[#E7F1FB]/40 py-1 px-2 rounded-md inline-block">
              Mã lỗi: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold"
          >
            <RotateCcw size={15} />
            <span>Thử lại</span>
          </button>
          <Link
            href="/dashboard"
            className="btn-secondary flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold"
          >
            <Home size={15} />
            <span>Về Tổng quan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
