import { Home, QrCode, User, Calendar, Users } from "lucide-react";

export const NAVIGATION_ITEMS = [
  {
    label: "Beranda",
    icon: Home,
    href: "/dashboard",
  },
  {
    label: "Jadwal M",
    icon: Calendar,
    href: "/manajemen/jadwal",
  },
  {
    label: "SCAN QR",
    icon: QrCode,
    isScanner: true,
  },
  {
    label: "Jadwal D",
    icon: Users,
    href: "/manajemen/dinas",
  },
  {
    label: "Profil",
    icon: User,
    href: "/profil",
  },
];
