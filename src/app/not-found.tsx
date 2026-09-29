import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] p-4 text-center select-none">
      <div className="card w-full max-w-md p-6 sm:p-8 space-y-5 border-[#E7F1FB] shadow-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1FB] text-[#2F78C8] border border-[#9EC9F3]/50 shadow-xs">
          <FileQuestion size={28} />
        </div>

        <div className="space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-[.2em] text-[#9EC9F3]">
            Lỗi 404
          </span>
          <h2 className="text-lg font-extrabold text-[#173A5E] sm:text-xl">
            Không tìm thấy trang
          </h2>
          <p className="text-xs text-[#5A7799] leading-relaxed">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển sang vị trí khác.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link
            href="/dashboard"
            className="btn-primary flex items-center justify-center gap-2 py-2.5 px-5 text-xs font-bold"
          >
            <Home size={15} />
            <span>Về Tổng quan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
