"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError, CreateVisitResponse } from "@/types/visit";

export function CreateVisitRedirect({
  patientId,
  returnTab,
}: {
  patientId: string;
  returnTab?: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function createVisit() {
      try {
        const response = await fetch(`/api/patients/${patientId}/visits`, { method: "POST" });
        const payload = (await response.json()) as CreateVisitResponse | ApiError;
        if (!response.ok || !("data" in payload)) {
          setError((payload as ApiError).error?.message || "Không thể tạo lần khám mới.");
          return;
        }
        const query = returnTab ? `?from=${encodeURIComponent(returnTab)}` : "";
        router.replace(`/patients/${patientId}/visits/${payload.data.id}${query}`);
        router.refresh();
      } catch {
        setError("Không thể tạo lần khám mới.");
      }
    }
    void createVisit();
  }, [patientId, returnTab, router]);
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;

  return (
    <div className="w-full max-w-[1600px] px-5 pb-12 pt-5 sm:px-8 lg:px-10 xl:px-12">
      <header className="border-b border-[#E7F1FB] pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
          <div className="space-y-2 pl-[60px] lg:pl-0">
            <Skeleton className="h-4 w-40 lg:ml-auto" />
            <Skeleton className="h-4 w-36 lg:ml-auto" />
          </div>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,2.08fr)_minmax(350px,1fr)]">
        <div className="space-y-8">
          <div className="rounded-[22px] border border-[#DFEAF5] bg-white p-6 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-[16px]" />
                <div className="space-y-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-4 w-64" /></div>
              </div>
              <Skeleton className="h-9 w-48 rounded-full" />
            </div>
            <Skeleton className="mt-6 h-28 w-full rounded-[17px]" />
          </div>
          <div className="rounded-[22px] border border-[#DFEAF5] bg-white p-6 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-[16px]" />
                <div className="space-y-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-72" /></div>
              </div>
              <Skeleton className="h-9 w-52 rounded-full" />
            </div>
            <Skeleton className="mt-7 h-[300px] w-full rounded-[18px]" />
            <Skeleton className="mt-8 h-5 w-56" />
            <Skeleton className="mt-5 h-24 w-full rounded-[16px]" />
          </div>
        </div>
        <div className="rounded-[22px] border border-[#DFEAF5] bg-white p-7 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-7 h-4 w-full max-w-[360px]" />
          <Skeleton className="mt-2 h-4 w-64" />
          <Skeleton className="mt-6 h-[225px] w-full rounded-[16px]" />
          <div className="mt-7 border-t border-[#E4EDF6] pt-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="mt-7 h-[52px] w-full rounded-[14px]" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
