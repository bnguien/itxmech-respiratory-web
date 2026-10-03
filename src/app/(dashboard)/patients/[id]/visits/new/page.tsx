import { CreateVisitRedirect } from "@/components/visits/create-visit-redirect";
export default async function NewVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <CreateVisitRedirect patientId={id} returnTab={query.from} />;
}
