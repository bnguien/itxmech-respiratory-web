"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Activity,
  User,
  X,
} from "lucide-react";
import { alerts } from "@/constants/mock-data";
import type { PatientListItem, PatientListResponse } from "@/types/patient";
import { LogoutButton } from "@/components/auth/logout-button";
import { useDoctorProfile } from "@/components/auth/doctor-profile-context";
import {
  getDoctorDisplayName,
  getDoctorSubtitle,
  getInitials,
} from "@/lib/auth/profile";

export function TopHeader() {
  const pathname = usePathname();
  const { profile } = useDoctorProfile();
  const doctorName = getDoctorDisplayName(profile);
  const doctorSubtitle = getDoctorSubtitle(profile);
  const doctorInitials = getInitials(doctorName);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [patientResults, setPatientResults] = useState<PatientListItem[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close popovers on route change
  useEffect(() => {
    setSearchOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Chào buổi sáng"
      : hour < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";

  const unreadAlerts = alerts.filter((a) => a.unread);
  useEffect(() => {
    if (!searchOpen || !searchQuery.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/patients?q=${encodeURIComponent(searchQuery.trim())}&page=1&limit=8`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (response.ok)
          setPatientResults(
            ((await response.json()) as PatientListResponse).data,
          );
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError"))
          setPatientResults([]);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  return (
    <header className="hidden lg:flex h-16 shrink-0 items-center justify-between border-b border-[#E7F1FB] bg-white px-8 select-none z-30">
      {/* Left: Greeting matching reference "Gud Morning Jez!" */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-[#173A5E]">
            {greeting},{" "}
            <span className="text-[#2F78C8]">
              {doctorName.replace(/^BS\.?\s*/i, "")}
            </span>
            !
          </h1>
          <p className="text-[11px] font-medium text-[#5A7799]">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Right: Actions [ Search ] [ Bell with badge ] [ Avatar with dropdown ] */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <div ref={searchRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setNotifOpen(false);
              setProfileOpen(false);
            }}
            title="Tìm kiếm bệnh nhân"
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#CCE2F7]/50 transition-all ${
              searchOpen
                ? "bg-[#E7F1FB] text-[#2F78C8] shadow-xs"
                : "bg-[#F4F8FD] text-[#5A7799] hover:bg-[#E7F1FB] hover:text-[#2F78C8]"
            }`}
          >
            <Search size={16} />
          </button>

          {/* Search Dropdown Popover */}
          {searchOpen && (
            <div className="absolute right-0 top-11 w-80 rounded-2xl border border-[#CCE2F7] bg-white p-3 shadow-xl z-50">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-[#5A7799]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Tìm theo tên hoặc mã BN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] py-2 pl-9 pr-8 text-xs text-[#173A5E] outline-none placeholder:text-[#5A7799]/70 focus:border-[#2F78C8] focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 text-[#5A7799] hover:text-[#173A5E]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Results */}
              <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                {searchQuery.trim() === "" ? (
                  <p className="py-3 text-center text-[11px] text-[#5A7799]">
                    Nhập tên bệnh nhân hoặc mã để tìm kiếm nhanh
                  </p>
                ) : patientResults.length > 0 ? (
                  patientResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/patients/${p.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-between rounded-xl p-2 transition hover:bg-[#F4F8FD]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F1FB] text-xs font-bold text-[#2F78C8]">
                          {p.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#173A5E]">
                            {p.full_name}
                          </p>
                          <p className="text-[10px] text-[#5A7799]">
                            {p.patient_code}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#2F78C8]">
                        Xem hồ sơ
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="py-3 text-center text-[11px] text-[#5A7799]">
                    Không tìm thấy bệnh nhân phù hợp
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications / Alerts Button with red count badge */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setSearchOpen(false);
              setProfileOpen(false);
            }}
            title="Thông báo cảnh báo lâm sàng"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-[#CCE2F7]/50 transition-all ${
              notifOpen
                ? "bg-[#E7F1FB] text-[#2F78C8] shadow-xs"
                : "bg-[#F4F8FD] text-[#5A7799] hover:bg-[#E7F1FB] hover:text-[#2F78C8]"
            }`}
          >
            <Bell size={16} />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B6B] px-1 text-[9px] font-bold text-white shadow-xs">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {notifOpen && (
            <div className="absolute right-0 top-11 w-84 rounded-2xl border border-[#CCE2F7] bg-white p-3 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-[#E7F1FB] pb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-[#173A5E]">
                    Cảnh báo lâm sàng
                  </h3>
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                    {unreadAlerts.length} mới
                  </span>
                </div>
                <Link
                  href="/alerts"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] font-bold text-[#2F78C8] hover:underline"
                >
                  Xem tất cả
                </Link>
              </div>

              <div className="mt-2 max-h-64 overflow-y-auto space-y-1.5">
                {alerts.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/patients/${item.patientId}`}
                    onClick={() => setNotifOpen(false)}
                    className="block rounded-xl border border-[#E7F1FB] bg-[#F8FAFD] p-2.5 transition hover:border-[#CCE2F7] hover:bg-[#F2F7FD]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#173A5E]">
                        {item.severity === "critical" ? (
                          <AlertTriangle size={13} className="text-red-500" />
                        ) : (
                          <Activity size={13} className="text-amber-500" />
                        )}
                        {item.patientName}
                      </span>
                      <span className="text-[10px] text-[#5A7799]">
                        {item.time}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#5A7799] line-clamp-2">
                      {item.message}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Doctor Avatar with Settings Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setSearchOpen(false);
              setNotifOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-full p-0.5 transition hover:bg-[#F4F8FD]"
          >
            {/* Avatar circle matching reference */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#173A5E] to-[#2F78C8] p-[2px] shadow-xs">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#E7F1FB] text-xs font-black text-[#2F78C8]">
                {doctorInitials}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-[#5A7799] transition-transform duration-200 ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Profile & Settings Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl border border-[#CCE2F7] bg-white p-2.5 shadow-xl z-50">
              {/* Doctor Details */}
              <div className="flex items-center gap-3 rounded-xl bg-[#F4F8FD] p-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F78C8] text-xs font-bold text-white">
                  {doctorInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-[#173A5E]">
                    {doctorName}
                  </p>
                  <p className="truncate text-[10px] text-[#5A7799]">
                    {doctorSubtitle}
                  </p>
                </div>
              </div>

              {/* Navigation links */}
              <div className="mt-2 space-y-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#173A5E] transition hover:bg-[#F4F8FD] hover:text-[#2F78C8]"
                >
                  <Settings size={15} className="text-[#5A7799]" />
                  <span>Cài đặt hệ thống</span>
                </Link>

                <Link
                  href="/alerts"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-[#173A5E] transition hover:bg-[#F4F8FD] hover:text-[#2F78C8]"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell size={15} className="text-[#5A7799]" />
                    <span>Trung tâm cảnh báo</span>
                  </span>
                  {unreadAlerts.length > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {unreadAlerts.length}
                    </span>
                  )}
                </Link>

                <div className="my-1 border-t border-[#E7F1FB]" />

                <LogoutButton
                  onLogout={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={15} />
                  <span>Đăng xuất</span>
                </LogoutButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
