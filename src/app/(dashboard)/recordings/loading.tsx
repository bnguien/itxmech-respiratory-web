import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function RecordingsLoading() {
  return (
    <div className="page space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-72" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
