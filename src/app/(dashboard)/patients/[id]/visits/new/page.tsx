import { Suspense } from "react";
import { notFound } from "next/navigation";
import { clinicalService } from "@/services/clinical.service";
import { VisitWorkspace } from "@/components/visits/visit-workspace";
import { patients } from "@/constants/mock-data";
export default async function NewVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient =
    id === "PAT-NEW"
      ? {
          ...patients[5],
          id: "PAT-NEW",
          code: "PAT-007",
          name: "Bệnh nhân mới",
        }
      : clinicalService.getPatient(id);
  if (!patient) notFound();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#5A7799]">Đang tải phòng khám...</div>}>
      <VisitWorkspace patient={patient} />
    </Suspense>
  );
}
