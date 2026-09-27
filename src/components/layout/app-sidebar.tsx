"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Cpu, LogOut, X } from "lucide-react";
import { navigation } from "@/constants/navigation";
import { Brand } from "@/components/ui/brand";

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [width, setWidth] = useState(224); // default 224px (w-56)
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("respicare_sidebar_width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 68 && parsed <= 380) {
        setWidth(parsed);
      }
    }
  }, []);

  const isCompact = width <= 90;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (onClose) return; // Disable drag resize on mobile drawer
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      let nextWidth = startWidth + delta;
      if (nextWidth < 120) {
        nextWidth = 68;
      } else {
        nextWidth = Math.min(380, Math.max(160, nextWidth));
      }
      setWidth(nextWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setIsDragging(false);

      const delta = upEvent.clientX - startX;
      let finalWidth = startWidth + delta;
      if (finalWidth < 120) {
        finalWidth = 68;
      } else {
        finalWidth = Math.min(380, Math.max(180, finalWidth));
      }
      setWidth(finalWidth);
      try {
        localStorage.setItem("respicare_sidebar_width", String(finalWidth));
      } catch {}
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const toggleCollapse = () => {
    const nextWidth = isCompact ? 224 : 68;
    setWidth(nextWidth);
    try {
      localStorage.setItem("respicare_sidebar_width", String(nextWidth));
    } catch {}
  };

  return (
    <aside
      style={!onClose ? { width: `${width}px` } : undefined}
      className={`relative flex h-full shrink-0 flex-col justify-between border-r border-[#E7F1FB] bg-white py-6 select-none ${
        onClose ? "w-64 px-4" : isCompact ? "px-2" : "px-4"
      } ${isDragging ? "transition-none" : "transition-[width] duration-200 ease-in-out"}`}
    >
      <div>
        <div
          className={`mb-8 flex items-start ${
            isCompact ? "justify-center px-0" : "justify-between px-3"
          }`}
        >
          <div className={isCompact ? "flex flex-col items-center" : ""}>
            <Brand compact={isCompact} />
            {!isCompact && (
              <p className="mt-2 pl-10 text-[10px] text-[#5A7799]">
                Hệ thống AIoT Hô hấp
              </p>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-[#5A7799]">
              <X size={19} />
            </button>
          )}
        </div>
        <nav className="space-y-1">
          {navigation.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                title={isCompact ? `${label}${badge ? ` (${badge})` : ""}` : undefined}
                className={`relative flex items-center rounded-xl py-2.5 text-sm transition ${
                  isCompact ? "justify-center px-2" : "justify-between px-3.5"
                } ${
                  active
                    ? "bg-[#E7F1FB] font-semibold text-[#2F78C8]"
                    : "text-[#5A7799] hover:bg-[#F4F8FD] hover:text-[#173A5E]"
                }`}
              >
                <span className={`flex items-center ${isCompact ? "justify-center" : "gap-3"}`}>
                  <Icon
                    size={16}
                    className={active ? "text-[#2F78C8]" : "text-[#9EC9F3]"}
                  />
                  {!isCompact && <span>{label}</span>}
                </span>
                {!isCompact && badge ? (
                  <span
                    className={`rounded-md px-1.5 text-[10px] ${
                      label === "Cảnh báo"
                        ? "bg-red-50 text-red-500"
                        : "bg-[#E7F1FB] text-[#2F78C8]"
                    }`}
                  >
                    {badge}
                  </span>
                ) : isCompact && badge ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-[#E7F1FB] pt-4">
        {!isCompact ? (
          <div className="rounded-xl border border-[#9EC9F3]/30 bg-[#F4F8FD] px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#2F78C8]">
              AI RespiSense Core
            </p>
            <p className="mt-1 text-[11px] text-[#5A7799]">
              Phân loại âm phổi 4 lớp
            </p>
          </div>
        ) : (
          <div
            title="AI RespiSense Core - Phân loại âm phổi 4 lớp"
            className="flex justify-center"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F4F8FD] text-[#2F78C8]">
              <Cpu size={15} />
            </span>
          </div>
        )}
        <Link
          href="/login"
          title={isCompact ? "Đăng xuất" : undefined}
          className={`flex items-center rounded-lg py-2 text-sm text-[#5A7799] hover:bg-red-50 hover:text-red-500 ${
            isCompact ? "justify-center px-2" : "gap-3 px-3.5"
          }`}
        >
          <LogOut size={16} />
          {!isCompact && <span>Đăng xuất</span>}
        </Link>
      </div>

      {/* Drag resize handle & Hover expand/collapse button */}
      {!onClose && (
        <div
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHoveringHandle(true)}
          onMouseLeave={() => setIsHoveringHandle(false)}
          onDoubleClick={toggleCollapse}
          title={
            isCompact
              ? "Kéo hoặc nhấn để mở rộng sidebar"
              : "Kéo để thu hẹp/mở rộng, nhấn để thu gọn"
          }
          className="group/handle absolute -right-2 top-0 bottom-0 z-30 flex w-4 cursor-col-resize items-center justify-center"
        >
          {/* Visual highlight line on border hover/drag */}
          <div
            className={`h-full w-1 transition-all ${
              isDragging
                ? "bg-[#2F78C8] opacity-100"
                : "bg-[#2F78C8] opacity-0 group-hover/handle:opacity-75"
            }`}
          />

          {/* Floating collapse/expand pill button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            className={`absolute top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-[#DDEAF8] bg-white text-[#5A7799] shadow-md transition-all hover:border-[#2F78C8] hover:bg-[#F4F8FD] hover:text-[#2F78C8] ${
              isDragging || isHoveringHandle
                ? "scale-100 opacity-100"
                : "scale-75 opacity-0 group-hover/handle:scale-100 group-hover/handle:opacity-100"
            }`}
            title={isCompact ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {isCompact ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      )}
    </aside>
  );
}
