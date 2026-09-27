import { Suspense } from "react";
import { notFound } from "next/navigation";
import { clinicalService } from "@/services/clinical.service";
import { PatientDetail } from "@/components/patients/patient-detail";
export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = clinicalService.getPatient(id);
  if (!patient) notFound();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#5A7799]">Đang tải hồ sơ bệnh nhân...</div>}>
      <PatientDetail
        patient={patient}
        patientRecordings={clinicalService
          .getRecordings()
          .filter((r) => r.patientId === id)}
      />
    </Suspense>
  );
}
