import { notFound } from "next/navigation";
import { clinicalService } from "@/services/clinical.service";
import { VisitDetail } from "@/components/visits/visit-detail";

const patientTabs = new Set(["overview", "spo2", "sound", "history", "notes"]);

export default async function VisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; visitId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id, visitId }, query] = await Promise.all([params, searchParams]);
  const patient = clinicalService.getPatient(id);
  if (!patient) notFound();

  const visit = patient.visits.find((item) => item.id === visitId) || {
    id: visitId,
    patientId: id,
    startedAt: "27/09/2026 · 16:20",
    doctor: "BS. Nguyễn Bảo Nguyên",
    spo2: patient.spo2,
    status: "completed" as const,
    recordingId: "REC-001",
    result: "Crackles + Wheezes" as const,
    note: "Đã review từng chu kỳ. Tiếp tục theo dõi SpO₂ và đánh giá lại nếu có diễn tiến.",
  };
  const returnTab =
    query.from && patientTabs.has(query.from) ? query.from : "overview";

  return <VisitDetail patient={patient} visit={visit} returnTab={returnTab} />;
}
