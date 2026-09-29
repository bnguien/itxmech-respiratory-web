import { Stethoscope } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs select-none">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Brand Icon with gentle glow */}
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute h-16 w-16 animate-ping rounded-3xl bg-[#E7F1FB] opacity-60 duration-1000" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#9EC9F3]/50 bg-[#E7F1FB] text-[#2F78C8] shadow-sm">
            <Stethoscope size={28} className="animate-pulse" />
          </div>
        </div>

        {/* Brand Title */}
        <div className="space-y-1">
          <span className="block text-[11px] font-bold uppercase tracking-[.24em] text-[#9EC9F3]">
            ITXMECH
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-[#173A5E] sm:text-2xl">
            Respiratory<span className="text-[#2F78C8]">Care</span>
          </h1>
          <p className="text-xs font-medium text-[#5A7799]">
            Hệ thống AIoT Hô hấp
          </p>
        </div>

        {/* Animated Three Dots (...) */}
        <div className="mt-5 flex items-center justify-center gap-1.5" aria-label="Đang tải...">
          <span className="loading-dot loading-dot-1" />
          <span className="loading-dot loading-dot-2" />
          <span className="loading-dot" />
        </div>
      </div>
    </div>
  );
}
