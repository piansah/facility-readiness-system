import { Home, QrCode, User, Calendar, LayoutList, Users, Shield } from "lucide-react";

export const NAVIGATION_ITEMS = [
  {
    label: "Beranda",
    icon: Home,
    href: "/dashboard",
  },
  {
    label: "SCAN QR",
    icon: QrCode,
    href: "/scan",
  },
  {
    label: "Aset & Fasilitas",
    icon: Shield,
    href: "/manajemen/fasilitas",
  },
  {
    label: "Daftar Pengguna",
    icon: Users,
    href: "/manajemen/pengguna",
  },
  {
    label: "Jadwal Maintenance",
    icon: Calendar,
    href: "/manajemen/jadwal",
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
