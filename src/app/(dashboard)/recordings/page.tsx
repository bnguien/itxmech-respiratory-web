import { Suspense } from "react";
import { RecordingsList } from "@/components/recordings/recordings-list";
export default function RecordingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#5A7799]">Đang tải danh sách bản ghi...</div>}>
      <RecordingsList />
    </Suspense>
  );
}
