import { Stethoscope } from "lucide-react";

export function Brand({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E7F1FB] text-[#2F78C8] shadow-xs">
        <Stethoscope size={19} />
      </div>
      {!compact && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-[.18em] text-[#9EC9F3]">
            ITXMECH
          </span>
          <strong
            className={`block text-base leading-tight tracking-tight font-extrabold ${
              inverted ? "text-white" : "text-[#173A5E]"
            }`}
          >
            Respiratory
            <span className={inverted ? "text-[#9EC9F3]" : "text-[#2F78C8]"}>
              Care
            </span>
          </strong>
        </div>
      )}
    </div>
  );
}
