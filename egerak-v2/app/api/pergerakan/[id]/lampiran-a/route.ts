import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pergerakan, users, sektors } from "@/lib/schema";
import { isFullAdmin } from "@/lib/roles";
import {
  buildLampiranAFields,
  generateLampiranADocx,
  lampiranADownloadFilename,
} from "@/lib/lampiran-a";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sila log masuk." }, { status: 401 });
  }

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
  }

  const row = await db.query.pergerakan.findFirst({
    where: eq(pergerakan.id, id),
  });
  if (!row || !row.aktif) {
    return NextResponse.json({ error: "Rekod tidak dijumpai." }, { status: 404 });
  }
  if (row.jenis !== "Pergerakan") {
    return NextResponse.json(
      { error: "Lampiran A hanya untuk pergerakan rasmi." },
      { status: 400 },
    );
  }

  const userId = Number(session.user.id);
  const isAdmin = isFullAdmin(session.user.peranan);
  if (!isAdmin && row.userId !== userId) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const owner = await db.query.users.findFirst({
    where: eq(users.id, row.userId),
  });
  if (!owner) {
    return NextResponse.json({ error: "Pengguna tidak dijumpai." }, { status: 404 });
  }

  let sektorName: string | null = null;
  const sektorId = row.sektorId ?? owner.sektorId;
  if (sektorId != null) {
    const sektor = await db.query.sektors.findFirst({
      where: eq(sektors.id, sektorId),
    });
    sektorName = sektor?.name ?? null;
  }

  const fields = buildLampiranAFields({
    nama: owner.nama,
    jawatan: owner.jawatan,
    sektorName,
    lokasi: row.lokasi,
    urusan: row.urusan,
    tarikhPergi: row.tarikhPergi,
    tarikhKembali: row.tarikhKembali,
  });

  let buffer: Buffer;
  try {
    buffer = generateLampiranADocx(fields);
  } catch {
    return NextResponse.json(
      { error: "Gagal menjana dokumen. Hubungi pentadbir." },
      { status: 500 },
    );
  }

  const filename = lampiranADownloadFilename(id, row.urusan);
  const encoded = encodeURIComponent(filename);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
