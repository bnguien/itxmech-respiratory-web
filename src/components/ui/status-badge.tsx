import type { LungSound } from "@/types/clinical";

export function SoundLabel({ value }: { value: LungSound }) {
  const color =
    value === "Normal"
      ? "text-[#2F78C8]"
      : value === "Crackles"
        ? "text-[#F59E0B]"
        : value === "Wheezes"
          ? "text-[#6366F1]"
          : "text-[#EF4444]";
  return <span className={`font-semibold ${color}`}>{value}</span>;
}

export function ReviewBadge({ confirmed }: { confirmed: boolean }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${confirmed ? "bg-[#E7F1FB] text-[#2F78C8]" : "bg-[#FFF1F2] text-[#EF4444]"}`}
    >
      {confirmed ? "Đã xác nhận" : "Chờ xác nhận"}
    </span>
  );
}
