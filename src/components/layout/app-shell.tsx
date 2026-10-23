"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { MobileHeader } from "./mobile-header";
import { TopHeader } from "./top-header";
import { DoctorPanel } from "./doctor-panel";
import { DoctorProfileProvider } from "@/components/auth/doctor-profile-context";
import { CriticalAlertCards } from "@/components/alerts/critical-alert-cards";
import { WearableAlertsProvider } from "@/lib/alerts/use-wearable-alerts";
import type { AuthenticatedDoctor } from "@/types/auth";

export function AppShell({
  children,
  doctor,
}: {
  children: React.ReactNode;
  doctor: AuthenticatedDoctor;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <DoctorProfileProvider doctor={doctor}>
      <WearableAlertsProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
        <MobileHeader onMenu={() => setOpen(true)} />
        <div className="flex min-h-0 flex-1">
          <div className="hidden h-full lg:block">
            <AppSidebar />
          </div>
          {open && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <button
                aria-label="Đóng menu"
                className="absolute inset-0 bg-[#173A5E]/40"
                onClick={() => setOpen(false)}
              />
              <div className="relative">
                <AppSidebar onClose={() => setOpen(false)} />
              </div>
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
            <TopHeader />
            <CriticalAlertCards />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <main className="min-w-0 flex-1 overflow-y-auto bg-white">
                {children}
              </main>
              {pathname === "/dashboard" && <DoctorPanel />}
            </div>
          </div>
        </div>
      </div>
      </WearableAlertsProvider>
    </DoctorProfileProvider>
  );
}
