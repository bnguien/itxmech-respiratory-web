import { Stethoscope } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7F1FB] text-[#2F78C8]">
        <Stethoscope size={17} />
      </div>
      {!compact && (
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-[.17em] text-[#9EC9F3]">
            ITxMech
          </span>
          <strong className="block text-base leading-none tracking-tight text-[#173A5E]">
            Respiratory<span className="text-[#2F78C8]">Care</span>
          </strong>
        </div>
      )}
    </div>
  );
}
