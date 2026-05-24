import { requireUser } from "@/lib/rbac";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function TukarKataLaluanPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-md p-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-1">Tukar Kata Laluan</h1>
        <p className="text-sm text-slate-500 mb-4">
          {user.mustChangePassword
            ? "Anda perlu tukar kata laluan sebelum meneruskan."
            : "Kemas kini kata laluan akaun anda."}
        </p>
        <ChangePasswordForm forced={user.mustChangePassword} />
      </div>
    </div>
  );
}
