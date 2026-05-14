import { Home, ClipboardList, Camera, Wrench, User, BarChart3, Calendar, Users, BookOpen, Settings, Shield } from "lucide-react";

export const NAVIGATION_ITEMS = [
  {
    label: "Beranda",
    icon: Home,
    href: "/dashboard",
  },
  {
    label: "Laporan",
    icon: ClipboardList,
    href: "/laporan",
  },
  {
    label: "Scan QR",
    icon: Camera,
    isScanner: true,
  },
  {
    label: "Fasilitas",
    icon: Wrench,
    href: "/manajemen/fasilitas",
  },
  {
    label: "Statistik",
    icon: BarChart3,
    href: "/manajemen/statistik",
  },
  {
    label: "Jadwal",
    icon: Calendar,
    href: "/manajemen/jadwal",
  },
  {
    label: "Profil",
    icon: User,
    href: "/profil",
  },
];

export const SECONDARY_NAV_ITEMS = [
  {
    label: "Panduan",
    icon: BookOpen,
    href: "/panduan",
  },
  {
    label: "Pengaturan",
    icon: Settings,
    href: "/settings",
  },
];
