import { Suspense } from "react";
import { PatientProfileView } from "@/components/patients/patient-profile-view";
import { PatientDetailSkeleton } from "@/components/ui/skeleton";
export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <PatientDetailSkeleton />
      }
    >
      <PatientProfileView id={id} />
    </Suspense>
  );
}
