import { listAllSektors, listAllUsers } from "@/lib/actions/users";
import { requireAdmin } from "@/lib/rbac";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [users, sektors] = await Promise.all([listAllUsers(), listAllSektors()]);
  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pengurusan Pengguna</h1>
        <p className="text-sm text-slate-500">
          Tambah satu-satu, import CSV (kemas kini jika username wujud), atau nyahaktif pengguna.
        </p>
      </div>
      <AdminUsersClient
        users={users.map((u) => ({
          ...u,
          laporanSektorIds: Array.isArray(u.laporanSektorIds) ? u.laporanSektorIds : [],
          createdAt: u.createdAt.toISOString(),
        }))}
        sektors={sektors.map((s) => ({ id: s.id, code: s.code, name: s.name }))}
      />
    </div>
  );
}
