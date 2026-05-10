export type UserRole = "super_admin" | "admin" | "petugas" | "viewer";

export type AppProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  is_active: boolean;
};

export function canCreateReports(role?: UserRole) {
  return role === "admin" || role === "petugas";
}

export function canManageUnit(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function canReviewReports(role?: UserRole) {
  return role === "admin";
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
