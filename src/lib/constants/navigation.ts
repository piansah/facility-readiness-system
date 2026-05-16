import { Home, QrCode, User, Calendar, LayoutList } from "lucide-react";

export const NAVIGATION_ITEMS = [
  {
    label: "Beranda",
    icon: Home,
    href: "/dashboard",
  },
  {
    label: "Jadwal Maintenance",
    icon: Calendar,
    href: "/manajemen/jadwal",
  },
  {
    label: "SCAN QR",
    icon: QrCode,
    href: "/scan",
  },
  {
    label: "Jadwal Dinas",
    icon: LayoutList,
    href: "/manajemen/dinas",
  },
  {
    label: "Profil",
    icon: User,
    href: "/profil",
  },
];
