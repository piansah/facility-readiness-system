export type UserRole = "super_admin" | "admin" | "petugas" | "viewer";

export type AppProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  is_active: boolean;
};

/** Hanya Petugas yang membuat laporan harian */
export function canCreateReports(role?: UserRole) {
  return role === "petugas";
}

/** Petugas, Admin, dan Super Admin bisa melaporkan insiden/non-rutin */
export function canCreateIncidents(role?: UserRole) {
  return role === "petugas" || role === "admin" || role === "super_admin";
}

/** Admin mereview laporan yang disubmit Petugas */
export function canReviewReports(role?: UserRole) {
  return role === "admin";
}

/** Super Admin dan Admin bisa akses halaman manajemen (beda level) */
export function canAccessManagement(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

/** Hanya Super Admin yang bisa kelola Unit (tambah/edit/hapus unit bandara) */
export function canManageUnits(role?: UserRole) {
  return role === "super_admin";
}

/** Super Admin & Admin bisa kelola fasilitas (SA semua unit, Admin unit sendiri) */
export function canManageFacilities(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

/** Super Admin & Admin bisa kelola pengguna (SA semua, Admin unit sendiri) */
export function canManageUsers(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

/** @deprecated Gunakan canAccessManagement, canManageUnits, atau canManageFacilities */
export function canManageUnit(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function roleLabel(role?: UserRole) {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin Unit";
    case "petugas":
      return "Petugas";
    case "viewer":
      return "Viewer";
    default:
      return "Belum aktif";
  }
}
