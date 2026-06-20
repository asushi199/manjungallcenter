import type { UserPeranan } from "@/lib/roles";

export const PROTECTED_ADMIN_USERNAME = "admin";

export function isProtectedAdminUsername(username: string | null | undefined): boolean {
  return (username ?? "").trim().toLowerCase() === PROTECTED_ADMIN_USERNAME;
}

export function canEditProtectedAdminUsername(currentUsername: string, nextUsername: string): boolean {
  if (!isProtectedAdminUsername(currentUsername)) return true;
  return isProtectedAdminUsername(nextUsername);
}

export function canChangeProtectedAdminRole(
  username: string,
  nextPeranan: UserPeranan | string,
): boolean {
  if (!isProtectedAdminUsername(username)) return true;
  return nextPeranan === "Admin";
}

export function canDeactivateProtectedAdmin(username: string, nextAktif: boolean): boolean {
  if (!isProtectedAdminUsername(username)) return true;
  return nextAktif;
}
