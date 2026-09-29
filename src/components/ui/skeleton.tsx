import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[#E7F1FB]/70",
        className
      )}
      {...props}
    />
  );
}

export function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[#E7F1FB] bg-[#F8FAFC] px-5 py-3.5">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[#E7F1FB] p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 ? "w-1/3" : "")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card flex items-center justify-between gap-4 p-3.5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="space-y-1 text-center">
              <Skeleton className="h-3 w-10 mx-auto" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="hidden sm:block space-y-1 text-center">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-7 w-44 rounded-xl" />
      </div>
      <div className="h-[240px] w-full flex items-end gap-3 pt-6 px-2">
        {Array.from({ length: 12 }).map((_, i) => {
          const heights = ["40%", "65%", "50%", "85%", "70%", "90%", "60%", "75%", "95%", "80%", "70%", "85%"];
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <Skeleton
                className="w-full rounded-t-md"
                style={{ height: heights[i % heights.length] }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page space-y-7">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <MetricCardsSkeleton />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-16" />
        </div>
        <PatientListSkeleton count={4} />
      </div>

      <ChartSkeleton />
    </div>
  );
}
