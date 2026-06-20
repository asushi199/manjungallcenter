import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import {
  canImportRancangan,
  canSectorDeletePergerakan,
  canTrackPegawai,
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

/** Pentadbir penuh — pengguna, bilik cetak, dll. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isFullAdmin(user.peranan)) redirect("/dashboard");
  return user;
}

/** Laporan OPR — Admin/Penyelia (semua), Ketua (sektor sendiri), Timbalan (skop ditetapkan). */
export async function requireLaporanOprAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canViewLaporanOpr(user.peranan)) redirect("/dashboard");
  return user;
}

/** Analisis program — Admin/Penyelia (semua), Ketua/Timbalan (ikut skop sektor). */
export async function requireAnalisisAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canViewAnalisisPergerakan(user.peranan)) redirect("/dashboard");
  return user;
}

/** Import rancangan — Admin, Ketua Unit, Timbalan PPD (ikut skop sektor). */
export async function requireImportRancanganAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canImportRancangan(user.peranan)) redirect("/dashboard");
  return user;
}

/** Padam pergerakan (senarai) — Admin, Ketua Unit, Timbalan PPD (ikut skop sektor). */
export async function requireSectorPergerakanAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canSectorDeletePergerakan(user.peranan)) redirect("/dashboard");
  return user;
}

/** Jejak Pegawai — Admin/Penyelia/Timbalan (semua), Ketua Unit (sektor sendiri). */
export async function requireJejakPegawaiAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canTrackPegawai(user.peranan)) redirect("/dashboard");
  return user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await auth()) as Session | null;
  return session?.user ?? null;
}

export function asUserPeranan(peranan: string): UserPeranan {
  return peranan as UserPeranan;
}
