"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Cpu, LogOut, X } from "lucide-react";
import { navigation } from "@/constants/navigation";
import { Brand } from "@/components/ui/brand";
import { LogoutButton } from "@/components/auth/logout-button";

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [width, setWidth] = useState(236); // default 236px
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("respicare_sidebar_width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 72 && parsed <= 380) {
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
        nextWidth = 72;
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
        finalWidth = 72;
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

  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  const currentPath = optimisticHref || pathname;
  const getActiveIndex = (path: string) =>
    navigation.findIndex(({ href }) => path === href) !== -1
      ? navigation.findIndex(({ href }) => path === href)
      : navigation.findIndex(({ href }) => path.startsWith(`${href}/`));
  const activeIndex = getActiveIndex(currentPath);

  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorRect, setIndicatorRect] = useState<{
    top: number;
    height: number;
  } | null>(() => {
    const idx = getActiveIndex(pathname);
    return idx !== -1 ? { top: idx * 52, height: 48 } : null;
  });

  const updateIndicator = useCallback((index: number) => {
    if (index === -1) {
      setIndicatorRect(null);
      return;
    }
    const el = itemRefs.current[index];
    if (el) {
      setIndicatorRect({
        top: el.offsetTop,
        height: el.offsetHeight || 48,
      });
    }
  }, []);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  useEffect(() => {
    updateIndicator(activeIndex);
  }, [activeIndex, isCompact, width, updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator(activeIndex);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, updateIndicator]);

  // Recalculate indicator position after sidebar collapse/expand animation finishes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateIndicator(activeIndex);
    }, 220);
    return () => clearTimeout(timer);
  }, [activeIndex, isCompact, width, updateIndicator]);

  // ResizeObserver on the active element to guarantee indicator stays aligned
  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateIndicator(activeIndex);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeIndex, updateIndicator]);

  const toggleCollapse = () => {
    const nextWidth = isCompact ? 236 : 72;
    setWidth(nextWidth);
    try {
      localStorage.setItem("respicare_sidebar_width", String(nextWidth));
    } catch {}
  };

  return (
    <aside
      style={!onClose ? { width: `${width}px` } : undefined}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget) {
          updateIndicator(activeIndex);
        }
      }}
      className={`relative flex h-full shrink-0 flex-col justify-between bg-[#173A5E] text-white py-6 select-none ${
        onClose ? "w-64 shadow-2xl" : ""
      } ${isDragging ? "transition-none" : "transition-[width] duration-200 ease-in-out"}`}
    >
      <div>
        {/* Brand header */}
        <div
          className={`mb-8 flex items-start ${
            isCompact ? "justify-center px-0" : "justify-between px-4"
          }`}
        >
          <div className={isCompact ? "flex flex-col items-center" : ""}>
            <Brand compact={isCompact} inverted />
            {!isCompact && (
              <p className="mt-2 text-xs font-normal text-blue-100/75 text-center">
                Hệ thống AIoT Hô hấp
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#9EC9F3] hover:bg-white/10 hover:text-white"
            >
              <X size={19} />
            </button>
          )}
        </div>

        {/* Navigation list with smooth sliding curved active tab (matching reference) */}
        <nav className="relative space-y-1 overflow-visible">
          {/* Smooth sliding active tab indicator with curved inverted border radius */}
          {activeIndex !== -1 && indicatorRect && (
            <div
              style={{
                transform: `translate3d(0, ${indicatorRect.top}px, 0)`,
                height: `${indicatorRect.height}px`,
              }}
              className={`pointer-events-none absolute left-0 right-0 top-0 z-10 bg-white transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isCompact
                  ? "ml-2 -mr-[1px] rounded-l-xl"
                  : "ml-3 -mr-[1px] rounded-l-xl"
              }`}
            >
              {/* Top concave curve with 2px overlap */}
              <svg
                className="pointer-events-none absolute -top-[32px] right-0 h-[34px] w-[34px] fill-white"
                viewBox="0 0 34 34"
                aria-hidden="true"
              >
                <path d="M34 0 V34 H0 A34 34 0 0 0 34 0 Z" />
              </svg>

              {/* Bottom concave curve with 2px overlap */}
              <svg
                className="pointer-events-none absolute -bottom-[32px] right-0 h-[34px] w-[34px] fill-white"
                viewBox="0 0 34 34"
                aria-hidden="true"
              >
                <path d="M0 0 H34 V34 A34 34 0 0 0 0 0 Z" />
              </svg>
            </div>
          )}

          {navigation.map(({ href, label, icon: Icon, badge }, index) => {
            const active = activeIndex === index;
            return (
              <Link
                key={href}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                href={href}
                onClick={() => {
                  setOptimisticHref(href);
                  onClose?.();
                }}
                title={
                  isCompact
                    ? `${label}${badge ? ` (${badge})` : ""}`
                    : undefined
                }
                className={`group relative z-20 flex h-12 items-center text-sm transition-colors duration-200 select-none whitespace-nowrap overflow-hidden ${
                  isCompact
                    ? "mx-2 justify-center rounded-xl px-0"
                    : "mx-3 px-3 rounded-xl"
                } ${
                  active
                    ? "font-bold text-[#2F78C8]"
                    : "font-normal text-blue-100/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`flex items-center min-w-0 ${isCompact ? "justify-center" : "gap-3"}`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.4 : 1.75}
                    className={`shrink-0 transition-colors duration-200 ${
                      active
                        ? "text-[#2F78C8]"
                        : "text-[#9EC9F3] group-hover:text-white"
                    }`}
                  />
                  {!isCompact && (
                    <span
                      className={`truncate ${
                        active
                          ? "font-bold text-[#2F78C8]"
                          : "font-normal text-blue-100/80 group-hover:text-white"
                      }`}
                    >
                      {label}
                    </span>
                  )}
                </span>

                {!isCompact && badge ? (
                  <span
                    className={`ml-auto mr-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors duration-200 ${
                      label === "Cảnh báo"
                        ? "bg-red-500 text-white shadow-xs"
                        : active
                          ? "bg-[#2F78C8] text-white"
                          : "bg-white/20 text-white"
                    }`}
                  >
                    {badge}
                  </span>
                ) : isCompact && badge ? (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#173A5E] bg-red-500" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-3.5 space-y-3 border-t border-white/10 pt-4">
        <LogoutButton
          title={isCompact ? "Đăng xuất" : undefined}
          className={`group flex h-10 items-center rounded-xl text-sm font-normal text-blue-100/80 hover:bg-white/10 hover:text-white transition whitespace-nowrap overflow-hidden ${
            isCompact ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          <LogOut
            size={16}
            strokeWidth={1.75}
            className="shrink-0 text-[#9EC9F3] group-hover:text-white transition-colors"
          />
          {!isCompact && (
            <span className="truncate font-normal text-blue-100/80 group-hover:text-white">
              Đăng xuất
            </span>
          )}
        </LogoutButton>
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
            className={`absolute top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-[#2F78C8]/40 bg-[#173A5E] text-[#9EC9F3] shadow-md transition-all hover:border-white hover:bg-[#2F78C8] hover:text-white ${
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
