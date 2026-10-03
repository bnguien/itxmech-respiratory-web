"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  className,
  children,
  onLogout,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  onLogout?: () => void;
  title?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    if (isLoading) return;

    setIsLoading(true);
    onLogout?.();
    try {
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index);
        if (key?.startsWith("respicare:visit-draft:")) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}
