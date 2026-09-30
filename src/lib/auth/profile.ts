import type { DoctorProfile } from "@/types/auth";

export function getDoctorDisplayName(profile: DoctorProfile | null): string {
  return profile?.full_name.trim() || "Bác sĩ";
}

export function getDoctorSubtitle(profile: DoctorProfile | null): string {
  return (
    profile?.department?.trim() ||
    profile?.specialty?.trim() ||
    profile?.professional_title?.trim() ||
    "Bác sĩ"
  );
}

export function getInitials(name: string): string {
  const words = name
    .replace(/^BS\.?\s*/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "BS";

  return words
    .slice(-2)
    .map((word) => word[0]?.toLocaleUpperCase("vi-VN"))
    .join("");
}
