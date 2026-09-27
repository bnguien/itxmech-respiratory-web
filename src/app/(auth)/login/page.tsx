"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { doctor } from "@/constants/mock-data";
export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#E7F1FB] p-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-[#9EC9F3]/30 bg-white p-8 shadow-[0_20px_50px_rgba(23,58,94,.07)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand />
          <p className="text-xs text-[#5A7799]">
            Hệ thống AIoT hỗ trợ theo dõi hô hấp
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/dashboard");
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-semibold text-[#5A7799]">
            Email
            <input
              type="email"
              className="field mt-1"
              defaultValue={doctor.email}
            />
          </label>
          <label className="block text-xs font-semibold text-[#5A7799]">
            Mật khẩu
            <input
              type="password"
              className="field mt-1"
              defaultValue="respicare2026"
            />
          </label>
          <button className="btn-primary w-full py-3">
            Đăng nhập
            <ArrowRight size={15} />
          </button>
        </form>
        <div className="flex items-center justify-center gap-2 border-t border-[#E7F1FB] pt-5 text-[11px] text-[#5A7799]">
          <ShieldCheck size={14} className="text-[#2F78C8]" />
          Bảo mật dữ liệu y tế theo tiêu chuẩn lâm sàng
        </div>
      </div>
    </main>
  );
}
