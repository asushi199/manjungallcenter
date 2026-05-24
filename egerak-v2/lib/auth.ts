import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { users } from "./schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      nama: string;
      jawatan: string;
      peranan: "Admin" | "Pengguna";
      sektorId: number | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "ID & Kata Laluan",
      credentials: {
        username: { label: "Nama Pengguna", type: "text" },
        password: { label: "Kata Laluan", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;

        const row = await db.query.users.findFirst({
          where: eq(users.username, username.trim().toLowerCase()),
        });
        if (!row || !row.aktif) return null;

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

        return {
          id: String(row.id),
          name: row.nama,
          username: row.username,
          nama: row.nama,
          jawatan: row.jawatan,
          peranan: row.peranan,
          sektorId: row.sektorId,
          mustChangePassword: row.mustChangePassword,
        } as any;
      },
    }),
  ],
});
