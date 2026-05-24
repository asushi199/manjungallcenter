import type { NextAuthConfig } from "next-auth";

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
        session.user.username = (token as any).username;
        session.user.nama = (token as any).nama;
        session.user.jawatan = (token as any).jawatan;
        session.user.peranan = (token as any).peranan;
        session.user.sektorId = (token as any).sektorId;
        session.user.mustChangePassword = (token as any).mustChangePassword;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = Number((user as any).id);
        (token as any).username = (user as any).username;
        (token as any).nama = (user as any).nama;
        (token as any).jawatan = (user as any).jawatan;
        (token as any).peranan = (user as any).peranan;
        (token as any).sektorId = (user as any).sektorId;
        (token as any).mustChangePassword = (user as any).mustChangePassword;
      }
      if (trigger === "update" && session) {
        if (typeof session.mustChangePassword === "boolean") {
          (token as any).mustChangePassword = session.mustChangePassword;
        }
      }
      return token;
    },
  },
} satisfies NextAuthConfig;
