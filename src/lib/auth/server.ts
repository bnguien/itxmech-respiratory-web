import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthenticatedDoctor } from "@/types/auth";

export async function getAuthenticatedDoctor(): Promise<AuthenticatedDoctor | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile } = await supabase
    .from("doctor_profiles")
    .select(
      "id, full_name, professional_title, specialty, department, avatar_url, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? "",
    profile,
  };
}

export async function requireAuthenticatedDoctor(): Promise<AuthenticatedDoctor> {
  const doctor = await getAuthenticatedDoctor();

  if (!doctor) redirect("/login");

  return doctor;
}
