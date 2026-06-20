import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./db";
import { users } from "./schema";
const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const LOGIN_FAILURE_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_BLOCK_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;
const LOGIN_FAILURE_DELAY_MS = 350;

type LoginAttempt = {
  count: number;
  firstFailureAt: number;
  blockedUntil: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

function loginAttemptKey(username: string): string {
  return username.trim().toLowerCase() || "unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function failLogin(key: string): Promise<null> {
  const now = Date.now();
  const current = loginAttempts.get(key);
  const attempt =
    current && now - current.firstFailureAt <= LOGIN_FAILURE_WINDOW_MS
      ? current
      : { count: 0, firstFailureAt: now, blockedUntil: 0 };

  attempt.count += 1;
  if (attempt.count >= LOGIN_MAX_FAILURES) {
    attempt.blockedUntil = now + LOGIN_BLOCK_MS;
  }
  loginAttempts.set(key, attempt);

  await sleep(LOGIN_FAILURE_DELAY_MS);
  return null;
}

function isLoginBlocked(key: string): boolean {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  const now = Date.now();
  if (attempt.blockedUntil > now) return true;
  if (now - attempt.firstFailureAt > LOGIN_FAILURE_WINDOW_MS) {
    loginAttempts.delete(key);
  }
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "ID & Kata Laluan",
      credentials: {
        username: { label: "No. Kad Pengenalan (IC)", type: "text" },
        password: { label: "Kata Laluan", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return failLogin("unknown");
        const { username, password } = parsed.data;
        const key = loginAttemptKey(username);

        if (isLoginBlocked(key)) {
          await sleep(LOGIN_FAILURE_DELAY_MS);
          return null;
        }

        const row = await db.query.users.findFirst({
          where: eq(users.username, key),
        });
        if (!row || !row.aktif) return failLogin(key);

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return failLogin(key);

        loginAttempts.delete(key);

        return {
          id: String(row.id),
          name: row.nama,
          username: row.username,
          nama: row.nama,
          jawatan: row.jawatan,
          peranan: row.peranan,
          sektorId: row.sektorId,
          mustChangePassword: row.mustChangePassword,
        };
      },
    }),
  ],
});
