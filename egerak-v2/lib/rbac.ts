import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import {
  canViewAnalisisPergerakan,
  canViewLaporanOpr,
  isFullAdmin,
  type UserPeranan,
} from "./roles";

export type SessionUser = Session["user"];

export async function requireUser(): Promise<SessionUser> {
  const session = (await auth()) as Session | null;
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Pentadbir penuh — pengguna, import, padam pergerakan, dll. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isFullAdmin(user.peranan)) redirect("/dashboard");
  return user;
}

/** Laporan OPR — Admin (semua), Penyelia (semua), Ketua Unit (sektor sendiri). */
export async function requireLaporanOprAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canViewLaporanOpr(user.peranan)) redirect("/dashboard");
  return user;
}

/** Analisis program — Admin & Penyelia. */
export async function requireAnalisisAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canViewAnalisisPergerakan(user.peranan)) redirect("/dashboard");
  return user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await auth()) as Session | null;
  return session?.user ?? null;
}

export function asUserPeranan(peranan: string): UserPeranan {
  return peranan as UserPeranan;
}
