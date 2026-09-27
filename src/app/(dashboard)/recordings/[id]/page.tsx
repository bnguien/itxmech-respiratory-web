import { Suspense } from "react";
import { notFound } from "next/navigation";
import { clinicalService } from "@/services/clinical.service";
import { RecordingAnalysis } from "@/components/recordings/recording-analysis";
export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recording = clinicalService.getRecording(id);
  if (!recording) notFound();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#5A7799]">Đang tải phân tích bản ghi...</div>}>
      <RecordingAnalysis recording={recording} />
    </Suspense>
  );
}
