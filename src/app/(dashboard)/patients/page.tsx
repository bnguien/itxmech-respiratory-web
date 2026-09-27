import { Suspense } from "react";
import { PatientsList } from "@/components/patients/patients-list";
export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#5A7799]">Đang tải danh sách bệnh nhân...</div>}>
      <PatientsList />
    </Suspense>
  );
}
