import { redirect } from "next/navigation";
import { getAuthenticatedDoctor } from "@/lib/auth/server";

export default async function Home() {
  const doctor = await getAuthenticatedDoctor();
  redirect(doctor ? "/dashboard" : "/login");
}
