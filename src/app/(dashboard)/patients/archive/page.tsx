import { Suspense } from "react";
import { PatientsList } from "@/components/patients/patients-list";
import { TableSkeleton } from "@/components/ui/skeleton";

export default function ArchivedPatientsPage() {
  return (
    <Suspense
      fallback={
        <div className="page w-full space-y-6">
          <TableSkeleton rows={5} cols={5} />
        </div>
      }
    >
      <PatientsList archived />
    </Suspense>
  );
}
