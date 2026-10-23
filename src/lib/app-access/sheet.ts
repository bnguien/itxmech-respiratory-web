// Nội dung phiếu đăng nhập app người nhà (popup, phiếu A5, mã QR). Hàm thuần.
import type { AppAccessCredentials } from "@/types/patient";

/**
 * Nội dung mã QR. App RespiCare đăng ký scheme `respicare://login`: quét bằng nút "Quét mã QR" trong app
 * (hoặc camera điện thoại) sẽ điền sẵn hai mã. Ai có mã QR là đăng nhập được, giống như có tờ phiếu.
 */
export function loginUri(credentials: AppAccessCredentials): string {
  const params = new URLSearchParams({ patient: credentials.patient_code, code: credentials.access_code });
  return `respicare://login?${params.toString()}`;
}

export function shareText(patientName: string, credentials: AppAccessCredentials): string {
  return (
    `Đăng nhập app RespiCare để theo dõi SpO₂ của ${patientName}\n` +
    `Mã bệnh nhân: ${credentials.patient_code}\n` +
    `Mã truy cập: ${credentials.access_code}`
  );
}

export const SHEET_STEPS = [
  "Cài app RespiCare trên điện thoại Android.",
  "Mở app, bấm \"Quét mã QR\" và đưa camera vào mã bên cạnh (hoặc nhập tay hai mã).",
  "Điền tên người xem (ví dụ: Lan – con gái).",
  "Máy ở gần bệnh nhân bật \"Máy này kết nối vòng đeo tay\" để nhận dữ liệu từ vòng.",
];
