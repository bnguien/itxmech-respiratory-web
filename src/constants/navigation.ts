import {
  AudioLines,
  Archive,
  Bell,
  LayoutDashboard,
  Radio,
  Settings,
  Users,
} from "lucide-react";

export const navigation = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/patients", label: "Bệnh nhân", icon: Users },
  { href: "/recordings", label: "Âm phổi", icon: AudioLines, badge: 3 },
  { href: "/patients/archive", label: "Lưu trữ", icon: Archive },
  { href: "/devices", label: "Thiết bị", icon: Radio },
];
