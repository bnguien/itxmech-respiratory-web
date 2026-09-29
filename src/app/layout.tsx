import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITxMECH-RespiCare",
  description: "Hệ thống AIoT hỗ trợ theo dõi hô hấp",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
