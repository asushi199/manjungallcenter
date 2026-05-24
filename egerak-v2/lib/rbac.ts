import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type SessionUser = Session["user"];

export async function requireUser(): Promise<SessionUser> {
  const session = (await auth()) as Session | null;
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.peranan !== "Admin") redirect("/dashboard");
  return user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await auth()) as Session | null;
  return session?.user ?? null;
}
