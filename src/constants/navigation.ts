import {
  AudioLines,
  Bell,
  LayoutDashboard,
  Radio,
  Settings,
  Users,
} from "lucide-react";

export const navigation = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/patients", label: "Bệnh nhân", icon: Users },
  { href: "/recordings", label: "Bản ghi âm", icon: AudioLines, badge: 3 },
  { href: "/alerts", label: "Cảnh báo", icon: Bell, badge: 3 },
  { href: "/devices", label: "Thiết bị", icon: Radio },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];
