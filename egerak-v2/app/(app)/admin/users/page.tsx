import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { listAllSektors, listAllUsers } from "@/lib/actions/users";
import { requireAdmin } from "@/lib/rbac";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, sektors] = await Promise.all([listAllUsers(), listAllSektors()]);
  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <AdminNav />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Pengurusan Pengguna</h1>
          <p className="text-sm text-slate-500">Hanya pentadbir boleh menambah / menetapkan semula kata laluan.</p>
        </div>
        <Link href="/admin/import" className="btn-secondary">
          Import Rancangan
        </Link>
      </div>
      <AdminUsersClient
        users={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        sektors={sektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
      />
    </div>
  );
}
