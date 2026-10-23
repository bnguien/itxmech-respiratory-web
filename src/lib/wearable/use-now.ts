"use client";

import { useEffect, useState } from "react";

/**
 * Giờ hiện tại (epoch giây), cập nhật mỗi `intervalMs`, để dòng "chưa nhận dữ liệu N phút" tự đổi.
 * null ở lần render đầu (server và trình duyệt render giống nhau), có giá trị ngay sau khi gắn vào trang.
 */
export function useNowSeconds(intervalMs = 30_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
