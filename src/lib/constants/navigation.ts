import { Home, QrCode, User, BarChart3, Calendar, Users, BookOpen, Settings, ClipboardList, Wrench } from "lucide-react";

export const NAVIGATION_ITEMS = [
  {
    label: "Beranda",
    icon: Home,
    href: "/dashboard",
  },
  {
    label: "SCAN QR",
    icon: QrCode,
    isScanner: true,
  },
  {
    label: "Profil",
    icon: User,
    href: "/profil",
  },
];

export const SIDEBAR_EXTRA_ITEMS = [
  {
    label: "Laporan",
    icon: ClipboardList,
    href: "/laporan",
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
