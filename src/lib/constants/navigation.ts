import { Home, QrCode, User } from "lucide-react";

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
