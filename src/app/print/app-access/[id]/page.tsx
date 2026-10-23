import { AppAccessSheet } from "@/components/patients/app-access-sheet";

export const metadata = { title: "Phiếu đăng nhập app RespiCare" };

/** Trang in phiếu đăng nhập khổ A5 (không có thanh điều hướng), mở từ popup hoặc hồ sơ bệnh nhân. */
export default async function PrintAppAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppAccessSheet patientId={id} />;
}
