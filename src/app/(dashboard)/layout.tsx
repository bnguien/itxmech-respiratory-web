import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedDoctor } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const doctor = await requireAuthenticatedDoctor();

  return <AppShell doctor={doctor}>{children}</AppShell>;
}
