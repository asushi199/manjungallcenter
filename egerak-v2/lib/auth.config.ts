import type { NextAuthConfig } from "next-auth";
import type { UserPeranan } from "./roles";

type AuthUserFields = {
  id: string;
  username: string;
  nama: string;
  jawatan: string;
  peranan: UserPeranan;
  sektorId: number | null;
  mustChangePassword: boolean;
};

function tokenString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function tokenPeranan(value: unknown): UserPeranan {
  return typeof value === "string" ? (value as UserPeranan) : "Pengguna";
}

function tokenSektorId(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * Konfigurasi auth yang Edge-safe (untuk middleware).
 * JANGAN import db / bcrypt di sini — kedua-duanya tidak boleh jalan di Edge runtime.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = pathname.startsWith("/login");
      if (isPublic) return true;
      return !!auth;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = String(token.uid);
        session.user.username = tokenString(token.username);
        session.user.nama = tokenString(token.nama);
        session.user.jawatan = tokenString(token.jawatan);
        session.user.peranan = tokenPeranan(token.peranan);
        session.user.sektorId = tokenSektorId(token.sektorId);
        session.user.mustChangePassword =
          typeof token.mustChangePassword === "boolean" ? token.mustChangePassword : false;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const appUser = user as AuthUserFields;
        token.uid = Number(appUser.id);
        token.username = appUser.username;
        token.nama = appUser.nama;
        token.jawatan = appUser.jawatan;
        token.peranan = appUser.peranan;
        token.sektorId = appUser.sektorId;
        token.mustChangePassword = appUser.mustChangePassword;
      }
      if (trigger === "update" && session) {
        if (typeof session.mustChangePassword === "boolean") {
          token.mustChangePassword = session.mustChangePassword;
        }
      }
      return token;
    },
  },
} satisfies NextAuthConfig;
