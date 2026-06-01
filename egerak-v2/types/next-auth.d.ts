import type { DefaultSession } from "next-auth";
import type { UserPeranan } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      nama: string;
      jawatan: string;
      peranan: UserPeranan;
      sektorId: number | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    nama: string;
    jawatan: string;
    peranan: UserPeranan;
    sektorId: number | null;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: number;
    username?: string;
    nama?: string;
    jawatan?: string;
    peranan?: UserPeranan;
    sektorId?: number | null;
    mustChangePassword?: boolean;
  }
}
