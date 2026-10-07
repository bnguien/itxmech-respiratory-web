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
  const returnTab =
    query.from && patientTabs.has(query.from) ? query.from : "overview";

  return <VisitDetail patientId={id} visitId={visitId} returnTab={returnTab} />;
}
