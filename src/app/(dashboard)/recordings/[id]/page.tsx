import { Suspense } from "react";
import { notFound } from "next/navigation";
import { uuidPattern } from "@/lib/visits/validation";
import { RecordingAnalysis } from "@/components/recordings/recording-analysis";
export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#5A7799]">Đang tải phân tích bản ghi...</div>}>
      <RecordingAnalysis key={id} recordingId={id} />
    </Suspense>
  );
}
