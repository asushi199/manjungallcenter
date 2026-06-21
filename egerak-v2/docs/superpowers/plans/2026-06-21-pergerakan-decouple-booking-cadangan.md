# Pergerakan: Decouple Booking + Standardize Cadangan Urusan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Pergerakan form from booking rooms, make "Tidak perlu tulis OPR" a standalone option, and turn cadangan urusan into a name-standardization tool (room bookings for Budiman/Bestari; same-day, sektor-prioritized peer records elsewhere).

**Architecture:** Booking moves entirely to takwim auto-book + /bilik. The Pergerakan form becomes a pure movement record whose `urusan` is steered by two cadangan sources. Pure helpers (slot mapping, cadangan ranking) are unit-tested; server actions provide the data; the form orchestrates a soft "look-first" gate.

**Tech Stack:** Next.js (App Router, server actions), Drizzle ORM (Postgres/Supabase), React client components, Zod, `node:test` (via `npm test`), date-fns / date-fns-tz, Tailwind.

## Global Constraints

- Language of all user-facing copy: **Malay (Bahasa Melayu)**.
- OPR-exemption copy (verbatim): title **"Tidak perlu tulis OPR"**; helper **"OPR aktiviti ini ditulis oleh orang lain (penganjur atau rakan yang turut hadir)."**
- The two managed rooms resolve via existing `resolveBookableRoomCode(lokasi)` → `"BILIK_BUDIMAN" | "DEWAN_BESTARI" | null` (substring "budiman"/"bestari").
- Location presets come from `LOKASI_PRESETS` in `lib/pergerakan-presets.ts`: `["Dewan Bestari", "Bilik Budiman", "Lain-lain (taip sendiri)"]`.
- Slot windows: AM = 08:00–12:59, PM = 13:00–17:00 (`lib/room-slots.ts`, `computeRoomSlotsForRange`).
- Cadangan for "other locations": show **6 first**, rest behind "Lihat lagi (N)"; **same-day only**; **all sektors shown, own sektor on top**.
- "Tidak perlu tulis OPR" creates an OPR row with `status: "TIADA"` (existing mechanism in `submitPergerakan`).
- Existing pergerakan-linked room bookings are **NOT** modified or cancelled by this work.
- Out of scope: takwim import recognition / lifecycle (bug #5 residue), any new "activity" table or participant↔booking linkage. The Tambah Takwim lokasi dropdown is already done (commit `9f5a4d5`).
- Verify every task with `npx tsc --noEmit` and `npx eslint <changed files>`; run `npm test` after any change under `lib/`. All commands run from `egerak-v2/`.

---

## File Structure

- `lib/room-booking-policy.ts` *(exists)* — add nothing; reused as-is.
- `lib/analisis/day-activity-templates.ts` *(modify)* — thread `sektorId` through `DayActivityRow`/`DayActivityTemplate`; add `rankCadanganBySektor`.
- `lib/pergerakan-slot.ts` *(create)* — pure helper `slotsOnDay(pergi, kembali, ymd)`.
- `lib/actions/pergerakan.ts` *(modify)* — drop booking from `submitPergerakan`/`updatePergerakan`; standalone `tidakPerluOpr`; extend `listUrusanTemplatesForDay` with sektor ranking; add `listRoomBookingCadanganForDay`.
- `lib/actions/rooms.ts` *(reuse)* — `bookRoom` powers the "Tempah sekarang" button (no change needed).
- `app/(app)/new/PergerakanForm.tsx` *(modify)* — remove booking UI; add OPR checkbox; rework cadangan (soft gate, AM/PM, mode C, book-now).
- `tests/pergerakan-slot.test.ts` *(create)*.
- `tests/day-activity-templates.test.ts` *(create)*.

---

## Task 1: Pure helper — which slots a movement occupies on a given day

**Files:**
- Create: `lib/pergerakan-slot.ts`
- Test: `tests/pergerakan-slot.test.ts`

**Interfaces:**
- Consumes: `computeRoomSlotsForRange(pergi: Date, kembali: Date, opts?: {fullDay?: boolean}): {tarikh: string; slot: "AM"|"PM"}[]` from `lib/sync-room-bookings.ts`.
- Produces: `slotsOnDay(pergi: Date, kembali: Date, ymd: string): ("AM"|"PM")[]` and `attendanceKind(pergi: Date, kembali: Date, ymd: string): "AM" | "PM" | "FULL" | "NONE"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pergerakan-slot.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalInput } from "../lib/dates";
import { slotsOnDay, attendanceKind } from "../lib/pergerakan-slot";

function d(s: string): Date {
  const p = parseLocalInput(s);
  assert.ok(p);
  return p;
}

test("morning-only movement occupies AM", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-25"), ["AM"]);
  assert.equal(attendanceKind(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-25"), "AM");
});

test("afternoon-only movement occupies PM", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T13:30"), d("2026-06-25T16:00"), "2026-06-25"), ["PM"]);
  assert.equal(attendanceKind(d("2026-06-25T13:30"), d("2026-06-25T16:00"), "2026-06-25"), "PM");
});

test("all-day movement occupies both → FULL", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T08:00"), d("2026-06-25T17:00"), "2026-06-25"), ["AM", "PM"]);
  assert.equal(attendanceKind(d("2026-06-25T08:00"), d("2026-06-25T17:00"), "2026-06-25"), "FULL");
});

test("other day → NONE", () => {
  assert.deepEqual(slotsOnDay(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-26"), []);
  assert.equal(attendanceKind(d("2026-06-25T08:30"), d("2026-06-25T11:30"), "2026-06-26"), "NONE");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/pergerakan-slot'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/pergerakan-slot.ts
import { computeRoomSlotsForRange } from "@/lib/sync-room-bookings";

/** Slot (AM/PM) yang diduduki pergerakan pada satu tarikh. */
export function slotsOnDay(pergi: Date, kembali: Date, ymd: string): ("AM" | "PM")[] {
  return computeRoomSlotsForRange(pergi, kembali)
    .filter((s) => s.tarikh === ymd)
    .map((s) => s.slot);
}

/** Ringkasan kehadiran pada satu tarikh untuk serlahkan slot cadangan. */
export function attendanceKind(
  pergi: Date,
  kembali: Date,
  ymd: string,
): "AM" | "PM" | "FULL" | "NONE" {
  const slots = slotsOnDay(pergi, kembali, ymd);
  const am = slots.includes("AM");
  const pm = slots.includes("PM");
  if (am && pm) return "FULL";
  if (am) return "AM";
  if (pm) return "PM";
  return "NONE";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all 4 new tests green).

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npx tsc --noEmit && npx eslint lib/pergerakan-slot.ts tests/pergerakan-slot.test.ts`
Expected: no output (clean).

```bash
git add lib/pergerakan-slot.ts tests/pergerakan-slot.test.ts
git commit -m "Add pure helper: slots a movement occupies on a day"
```

---

## Task 2: Cadangan ranking — own sektor first (pure)

**Files:**
- Modify: `lib/analisis/day-activity-templates.ts`
- Test: `tests/day-activity-templates.test.ts`

**Interfaces:**
- Consumes: `urusanMatches(a, b)` from `lib/analisis/normalize-text.ts` (existing).
- Produces:
  - `DayActivityRow` gains optional `sektorId?: number | null`.
  - `DayActivityTemplate` gains `sektorId: number | null` (from the group's first row).
  - `buildDayUrusanCadangan(rows: DayActivityRow[]): DayActivityTemplate[]` (unchanged signature; now carries `sektorId`).
  - `rankCadanganBySektor(templates: DayActivityTemplate[], ownSektorId: number | null): DayActivityTemplate[]` — stable sort with own-sektor templates first, order otherwise preserved.

- [ ] **Step 1: Write the failing test**

```ts
// tests/day-activity-templates.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDayUrusanCadangan,
  rankCadanganBySektor,
  type DayActivityRow,
} from "../lib/analisis/day-activity-templates";

const base = (over: Partial<DayActivityRow>): DayActivityRow => ({
  urusan: "Mesyuarat",
  lokasi: "SK Seri Manjung",
  tarikhPergi: new Date("2026-06-25T08:00:00+08:00"),
  tarikhKembali: new Date("2026-06-25T17:00:00+08:00"),
  sektorId: 1,
  ...over,
});

test("template carries the sektorId of its group", () => {
  const out = buildDayUrusanCadangan([base({ urusan: "Mesyuarat Panitia", sektorId: 7 })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].sektorId, 7);
});

test("rankCadanganBySektor puts own sektor first, preserves the rest", () => {
  const t = buildDayUrusanCadangan([
    base({ urusan: "Aktiviti A", sektorId: 2 }),
    base({ urusan: "Aktiviti B", sektorId: 5 }),
    base({ urusan: "Aktiviti C", sektorId: 5 }),
  ]);
  const ranked = rankCadanganBySektor(t, 5);
  assert.deepEqual(
    ranked.map((x) => x.sektorId),
    [5, 5, 2],
  );
});

test("rankCadanganBySektor with null ownSektorId keeps original order", () => {
  const t = buildDayUrusanCadangan([
    base({ urusan: "Aktiviti A", sektorId: 2 }),
    base({ urusan: "Aktiviti B", sektorId: 5 }),
  ]);
  assert.deepEqual(rankCadanganBySektor(t, null), t);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `rankCadanganBySektor` not exported / `sektorId` missing on type.

- [ ] **Step 3: Implement — thread sektorId + add ranking**

Edit `lib/analisis/day-activity-templates.ts`. In the group `.map`, add `sektorId: lead.sektorId ?? null` to the returned template. Update both types and append the new function:

```ts
// In the .map(...) return object, add:
        sektorId: lead.sektorId ?? null,
```

```ts
export type DayActivityRow = {
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
  sektorId?: number | null;
};

export type DayActivityTemplate = {
  urusan: string;
  lokasi: string;
  tarikhPergi: Date;
  tarikhKembali: Date;
  count: number;
  sektorId: number | null;
};

/** Utamakan cadangan sektor sendiri; selebihnya kekal susunan asal (stable). */
export function rankCadanganBySektor(
  templates: DayActivityTemplate[],
  ownSektorId: number | null,
): DayActivityTemplate[] {
  if (ownSektorId == null) return templates;
  const own = templates.filter((t) => t.sektorId === ownSektorId);
  const rest = templates.filter((t) => t.sektorId !== ownSektorId);
  return [...own, ...rest];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (new tests green; existing suites unaffected).

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npx tsc --noEmit && npx eslint lib/analisis/day-activity-templates.ts tests/day-activity-templates.test.ts`
Expected: clean. (If `tsc` flags `listUrusanTemplatesForDay` for the new required `sektorId` on templates, that is fixed in Task 3 — if blocking, do Steps of Task 3 before committing; otherwise the optional `sektorId?` on the row keeps callers compiling.)

```bash
git add lib/analisis/day-activity-templates.ts tests/day-activity-templates.test.ts
git commit -m "Cadangan: carry sektorId and add own-sektor ranking"
```

---

## Task 3: Server cadangan queries (sektor ranking + room-booking source)

**Files:**
- Modify: `lib/actions/pergerakan.ts` (`listUrusanTemplatesForDay`, ~line 747; add new action)

**Interfaces:**
- Consumes: `buildDayUrusanCadangan`, `rankCadanganBySektor` (Task 2); `roomBookings`, `rooms` schema; `resolveBookableRoomCode`; `requireUser` (gives `user.sektorId`).
- Produces:
  - `listUrusanTemplatesForDay(ymdDate: string)` — unchanged return shape `UrusanTemplate[]`, now own-sektor-ranked; each `UrusanTemplate` already has `{urusan, lokasi, tarikhPergi, tarikhKembali, count}`.
  - New: `listRoomBookingCadanganForDay(roomCode: "BILIK_BUDIMAN" | "DEWAN_BESTARI", ymdDate: string): Promise<RoomCadangan[]>` where `RoomCadangan = { title: string; kind: "AM" | "PM" | "FULL" }`.

- [ ] **Step 1: Thread sektorId into the day-template query**

In `listUrusanTemplatesForDay`, select `pergerakan.sektorId` and `takwimAktiviti.sektorId` in the two queries, pass `sektorId` into the rows fed to `buildDayUrusanCadangan`, and rank by the caller's sektor. Replace the query/return tail:

```ts
const user = await requireUser();
// ... (date guards unchanged) ...
const rows = await withDbTimeout(
  db
    .select({
      urusan: pergerakan.urusan,
      lokasi: pergerakan.lokasi,
      tarikhPergi: pergerakan.tarikhPergi,
      tarikhKembali: pergerakan.tarikhKembali,
      sektorId: pergerakan.sektorId,
    })
    .from(pergerakan)
    .where(
      and(
        eq(pergerakan.aktif, true),
        eq(pergerakan.jenis, "Pergerakan"),
        lte(pergerakan.tarikhPergi, end),
        gte(pergerakan.tarikhKembali, start),
      ),
    )
    .orderBy(desc(pergerakan.tarikhPergi))
    .limit(500),
);

const masterRows = await withDbTimeout(
  db
    .select({
      urusan: takwimAktiviti.urusan,
      lokasi: takwimAktiviti.lokasi,
      tarikhPergi: takwimAktiviti.tarikhPergi,
      tarikhKembali: takwimAktiviti.tarikhKembali,
      sektorId: takwimAktiviti.sektorId,
    })
    .from(takwimAktiviti)
    .where(
      and(
        eq(takwimAktiviti.aktif, true),
        eq(takwimAktiviti.kategori, "rancangan"),
        isNull(takwimAktiviti.sourcePergerakanId),
        lte(takwimAktiviti.tarikhPergi, end),
        gte(takwimAktiviti.tarikhKembali, start),
      ),
    )
    .limit(500),
);

const templates = buildDayUrusanCadangan(
  [...rows, ...masterRows].map((r) => ({
    urusan: String(r.urusan || ""),
    lokasi: String(r.lokasi || ""),
    tarikhPergi: new Date(r.tarikhPergi),
    tarikhKembali: new Date(r.tarikhKembali),
    sektorId: r.sektorId ?? null,
  })),
);

const ownSektorId =
  user.sektorId != null && Number.isFinite(Number(user.sektorId))
    ? Number(user.sektorId)
    : null;

return rankCadanganBySektor(templates, ownSektorId).map((g) => ({
  urusan: g.urusan,
  lokasi: g.lokasi,
  tarikhPergi: toLocalInput(g.tarikhPergi),
  tarikhKembali: toLocalInput(g.tarikhKembali),
  count: g.count,
}));
```

Add `rankCadanganBySektor` to the existing import from `@/lib/analisis/day-activity-templates`.

- [ ] **Step 2: Add the room-booking cadangan action**

Append to `lib/actions/pergerakan.ts` (imports `roomBookings`, `rooms` already present in the file's schema import; confirm and add if missing):

```ts
export type RoomCadangan = { title: string; kind: "AM" | "PM" | "FULL" };

/** Cadangan urusan untuk Budiman/Bestari = tempahan sebenar bilik pada hari itu. */
export async function listRoomBookingCadanganForDay(
  roomCode: "BILIK_BUDIMAN" | "DEWAN_BESTARI",
  ymdDate: string,
): Promise<RoomCadangan[]> {
  await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) return [];

  const room = await db.query.rooms.findFirst({ where: eq(rooms.code, roomCode) });
  if (!room) return [];

  const rows = await db
    .select({ slot: roomBookings.slot, title: roomBookings.title })
    .from(roomBookings)
    .where(
      and(
        eq(roomBookings.roomId, room.id),
        eq(roomBookings.tarikh, ymdDate),
        eq(roomBookings.status, "BOOKED"),
      ),
    );

  const am = rows.find((r) => r.slot === "AM");
  const pm = rows.find((r) => r.slot === "PM");
  // Sepanjang hari (tajuk AM == PM) → satu entri.
  if (am && pm && am.title === pm.title) return [{ title: am.title, kind: "FULL" }];
  const out: RoomCadangan[] = [];
  if (am) out.push({ title: am.title, kind: "AM" });
  if (pm) out.push({ title: pm.title, kind: "PM" });
  return out;
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint lib/actions/pergerakan.ts`
Expected: clean. (If `roomBookings`/`rooms` are not yet imported in this file, add them to the existing `@/lib/schema` import.)

- [ ] **Step 4: Run tests (regression)**

Run: `npm test`
Expected: PASS (no behavioral test here; confirms nothing broke).

- [ ] **Step 5: Commit**

```bash
git add lib/actions/pergerakan.ts
git commit -m "Cadangan server: own-sektor ranking + room-booking source"
```

---

## Task 4: Remove room booking from Pergerakan server actions; standalone OPR

**Files:**
- Modify: `lib/actions/pergerakan.ts` (`submitPergerakan` ~85-180, `updatePergerakan` ~274-345, `getPergerakanForEdit` ~252-272)

**Interfaces:**
- Produces: `submitPergerakan`/`updatePergerakan` no longer touch `room_bookings`; `tidakPerluOpr` honored independent of location. `SubmitResult` keeps shape but `roomSlotsBooked` is always absent now (leave the optional field for compatibility; do not set it).

- [ ] **Step 1: `submitPergerakan` — drop booking, keep OPR exemption**

Replace the body from `const roomCode = ...` through the audit insert with the booking-free version:

```ts
  // Tiada lagi tempahan bilik dari pergerakan; tempahan hanya via takwim + /bilik.
  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(pergerakan)
        .values({
          userId: Number(user.id),
          sektorId: user.sektorId,
          jenis,
          urusan,
          lokasi,
          tarikhPergi: pergi,
          tarikhKembali: kembali,
          source: "web",
        })
        .returning({ id: pergerakan.id });

      if (jenis === "Pergerakan" && tidakPerluOpr === true) {
        await tx.insert(opr).values({ pergerakanId: row.id, status: "TIADA" });
      }

      await tx.insert(auditLog).values({
        action: "SUBMIT_PERGERAKAN",
        userId: Number(user.id),
        detail: { id: row.id, jenis, urusan, lokasi, tidakPerluOpr: tidakPerluOpr === true },
      });

      return { id: row.id };
    });

    revalidatePath("/dashboard");
    revalidatePath("/my");
    return { ok: true, id: result.id };
  } catch (e) {
    throw e;
  }
```

Then remove the now-unused destructured `sepenuhHari`, `tempahBilik` from the `const { ... } = parsed.data;` block (keep `tidakPerluOpr`). Leave `submitSchema` fields as-is (backward-compatible; `sepenuhHari`/`tempahBilik` simply ignored).

- [ ] **Step 2: `updatePergerakan` — drop booking sync**

Remove the `roomCode`/`shouldBookRoom` lines, the `cancelRoomBookingsForPergerakan(tx, [id], ...)` call, and the `syncRoomBookingsFromPergerakan` block. The transaction keeps only the `pergerakan` update + audit:

```ts
  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(pergerakan)
        .set({ jenis, urusan, lokasi, tarikhPergi: pergi, tarikhKembali: kembali, updatedAt: new Date() })
        .where(eq(pergerakan.id, id));

      await tx.insert(auditLog).values({
        action: "UPDATE_PERGERAKAN",
        userId: Number(user.id),
        detail: { id, jenis, urusan, lokasi },
      });

      return { id };
    });

    revalidatePath("/dashboard");
    revalidatePath("/my");
    revalidatePath(`/my/${id}/edit`);
    return { ok: true, id: result.id };
  } catch (e) {
    throw e;
  }
```

Remove `tempahBilik`/`sepenuhHari` from the destructure in `updatePergerakan` too.

- [ ] **Step 3: Clean up dead imports/exports**

- `getPergerakanForEdit`: the `tempahBilik` field (derived from an active booking) is no longer used by the form. Keep the function but the form will ignore `tempahBilik`; no change required here (leave the field to avoid touching `PergerakanEditData` consumers — verify in Step 5).
- Remove `checkPergerakanRoomAvailability` export and its `previewRoomBookingsForPergerakan` import IF no other file imports them (checked in Step 4). The form stops importing it in Task 5, so order: do Task 5 first OR leave the export unused for now. **Decision: leave `checkPergerakanRoomAvailability` in place until Task 5 removes its only caller, then delete in Task 5 Step 6.**

- [ ] **Step 4: Verify no other booking callers remain**

Run: `npx eslint lib/actions/pergerakan.ts && npx tsc --noEmit`
Expected: clean. If `tsc` reports `syncRoomBookingsFromPergerakan` / `cancelRoomBookingsForPergerakan` imported but unused, remove them from the import list in `lib/actions/pergerakan.ts`.

- [ ] **Step 5: Run tests (regression)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/pergerakan.ts
git commit -m "Pergerakan: stop booking rooms; keep standalone OPR exemption"
```

---

## Task 5: Rework the Pergerakan form (remove booking UI, OPR checkbox, two-source cadangan, soft gate, AM/PM, book-now)

**Files:**
- Modify: `app/(app)/new/PergerakanForm.tsx`
- Reuse: `listUrusanTemplatesForDay`, `listRoomBookingCadanganForDay` (Task 3), `bookRoom` from `lib/actions/rooms.ts`, `attendanceKind` (Task 1), `resolveBookableRoomCode` (via a new server check or client regex), `LOKASI_PRESETS`.

**Interfaces:**
- Consumes: `RoomCadangan` and `UrusanTemplate` types from `lib/actions/pergerakan.ts`; `bookRoom(input)` returns `{ ok: true; id; slotsBooked? } | { ok: false; error }`.
- Produces: a form whose submitted `urusan` is constrained by the gate rules in the spec.

> This is a UI-heavy task with no unit-test harness in the repo; verify via `tsc`, `eslint`, and the manual checklist in Step 7.

- [ ] **Step 1: Remove the booking UI and its state**

In `PergerakanForm.tsx` delete:
- the import of `checkPergerakanRoomAvailability`, `RoomAvailabilityCheck`, and `emptyAvailability`;
- state `availability`, `checkingRoom`, `showBilikLink`;
- `needsRoom`, `willBookRoom`, `hasRoomConflict`, `slotCount`, and the `useEffect` that calls `checkPergerakanRoomAvailability` (lines ~170-201);
- the entire `needsRoom && (<fieldset> Bilik/Dewan …)` block, the `willBookRoom && (sepenuh hari)` block, the `willBookRoom && (availability summary)` block, and the `needsRoom && !tempahBilik` info block;
- `tempahBilik`, `sepenuhHari` state (and `setTempahBilik`/`setSepenuhHari` usages), and the `applyTemplate` lines that set them.

Keep `tidakPerluOpr` state.

- [ ] **Step 2: Add the standalone OPR checkbox (verbatim copy)**

Render, for `jenis === "Pergerakan"` only, after the Lokasi block:

```tsx
{jenis === "Pergerakan" && (
  <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
    <input
      type="checkbox"
      className="mt-0.5"
      checked={tidakPerluOpr}
      onChange={(e) => setTidakPerluOpr(e.target.checked)}
    />
    <span>
      <strong>Tidak perlu tulis OPR</strong>
      <span className="block text-xs text-slate-600 mt-0.5">
        OPR aktiviti ini ditulis oleh orang lain (penganjur atau rakan yang turut hadir).
      </span>
    </span>
  </label>
)}
```

Update the submit `payload` to always send `tidakPerluOpr: jenis === "Pergerakan" ? tidakPerluOpr : undefined` and drop `tempahBilik`/`sepenuhHari` from it.

- [ ] **Step 3: Add cadangan state + loaders (two sources, soft gate)**

Add a derived room code and two suggestion stores. Replace the existing `urusanSuggest` machinery with a unified loader keyed on `tarikhPergi` + `lokasi`:

```tsx
const roomCode = /budiman/i.test(lokasi) ? "BILIK_BUDIMAN" : /bestari/i.test(lokasi) ? "DEWAN_BESTARI" : null;

const [cadanganLoading, setCadanganLoading] = useState(false);
const [peerCadangan, setPeerCadangan] = useState<UrusanTemplate[]>([]);
const [roomCadangan, setRoomCadangan] = useState<RoomCadangan[]>([]);
const [showAllPeers, setShowAllPeers] = useState(false);
const [urusanUnlocked, setUrusanUnlocked] = useState(false); // mode C escape (rooms with bookings)
```

In a debounced `useEffect` on `[tarikhPergi, roomCode]` (skip when `jenis !== "Pergerakan"` or no date): set `cadanganLoading=true`, then in parallel call `listUrusanTemplatesForDay(ymd)` and (when `roomCode`) `listRoomBookingCadanganForDay(roomCode, ymd)`; store results; `cadanganLoading=false`; reset `showAllPeers=false` and `urusanUnlocked=false`. Derive `ymd` from `parseLocalInput(tarikhPergi)` + `formatInTimeZone(..., TZ, "yyyy-MM-dd")` exactly as the current `urusanSuggest` effect does.

- [ ] **Step 4: Compute gate state**

```tsx
const hasRoomBookings = roomCadangan.length > 0;
const roomNoBooking = roomCode != null && !cadanganLoading && !hasRoomBookings;

// Mode C only for rooms WITH bookings: must pick or tick "tiada dalam senarai".
const modeCActive = roomCode != null && hasRoomBookings && !urusanUnlocked;

// Soft gate (lock urusan while loading) applies whenever cadangan are being fetched.
const urusanDisabled = cadanganLoading || modeCActive;

const attended = (() => {
  const p = parseLocalInput(tarikhPergi);
  const k = parseLocalInput(tarikhKembali);
  const day = p ? formatInTimeZone(p, TZ, "yyyy-MM-dd") : null;
  return p && k && day ? attendanceKind(p, k, day) : "NONE";
})();
```

- [ ] **Step 5: Render cadangan blocks**

Replace the old `urusanSuggest` details block with:

```tsx
{jenis === "Pergerakan" && cadanganLoading && (
  <p className="text-xs text-slate-500">Mencari aktiviti hari ini…</p>
)}

{/* Budiman/Bestari WITH bookings → mode C list */}
{roomCode && hasRoomBookings && (
  <div className="rounded-md border border-brand-200 bg-brand-50/60 p-3 space-y-2">
    <p className="text-xs font-medium text-brand-900">
      Pilih aktiviti tempahan bilik ini (nama diseragamkan):
    </p>
    {roomCadangan.map((c) => {
      const highlight =
        c.kind === "FULL" || attended === "FULL" || attended === c.kind;
      return (
        <button
          key={`${c.kind}-${c.title}`}
          type="button"
          onClick={() => { setUrusan(c.title); }}
          className={cn(
            "block w-full text-left rounded-md border px-3 py-2 text-sm",
            urusan === c.title ? "border-brand-500 bg-white" : "border-slate-200 bg-white",
            highlight ? "" : "opacity-60",
          )}
        >
          <span className="font-semibold">{c.title}</span>
          <span className="ml-2 text-xs text-slate-500">
            {c.kind === "FULL" ? "Sepanjang hari" : c.kind === "AM" ? "Pagi" : "Petang"}
          </span>
        </button>
      );
    })}
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" checked={urusanUnlocked} onChange={(e) => setUrusanUnlocked(e.target.checked)} />
      Aktiviti tiada dalam senarai (taip sendiri)
    </label>
  </div>
)}

{/* Budiman/Bestari WITHOUT booking → lenient reminder + book-now */}
{roomNoBooking && (
  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 space-y-2">
    <p>Bilik ini tiada tempahan rasmi pada hari ini. Jika aktiviti rasmi, sila tempah di Tempahan Bilik.</p>
    <button type="button" className="btn-secondary text-xs" disabled={pending || !urusan.trim()} onClick={onBookNow}>
      Tempah sekarang
    </button>
  </div>
)}

{/* Peer cadangan (other locations, and the no-booking room fallback) */}
{jenis === "Pergerakan" && !cadanganLoading && !hasRoomBookings && peerCadangan.length > 0 && (
  <div className="space-y-2">
    <p className="text-xs font-medium text-slate-700">Cadangan urusan hari ini:</p>
    <div className="flex flex-col gap-2">
      {(showAllPeers ? peerCadangan : peerCadangan.slice(0, 6)).map((t) => (
        <button
          key={`${t.urusan}|${t.lokasi}|${t.tarikhPergi}`}
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
          onClick={() => applyTemplate(t)}
        >
          <div className="text-sm font-semibold text-slate-900">{t.urusan}</div>
          <div className="text-xs text-slate-600 mt-0.5">{t.lokasi} · {t.count} rekod</div>
        </button>
      ))}
    </div>
    {peerCadangan.length > 6 && !showAllPeers && (
      <button type="button" className="text-xs underline text-slate-600" onClick={() => setShowAllPeers(true)}>
        Lihat lagi ({peerCadangan.length - 6})
      </button>
    )}
  </div>
)}
```

Simplify `applyTemplate(t)` to set `jenis="Pergerakan"`, `setUrusan(t.urusan)`, `applyLokasi(t.lokasi)`, `setTarikhPergi(t.tarikhPergi)`, `setTarikhKembali(t.tarikhKembali)` only (drop the room/`tempahBilik`/`tidakPerluOpr` lines).

- [ ] **Step 6: Wire the urusan textarea gate + book-now handler + drop dead server export**

Make the textarea respect the gate:

```tsx
<textarea
  id="urusan"
  className="input min-h-[96px]"
  required
  disabled={urusanDisabled}
  value={urusan}
  onChange={(e) => setUrusan(e.target.value)}
  placeholder={urusanDisabled ? "Pilih cadangan di atas, atau tunggu sebentar…" : "Contoh: Mesyuarat Pengurusan Kewangan PPD Manjung"}
/>
```

Add the book-now handler (reuses `bookRoom`; AM/PM from `attendanceKind`):

```tsx
function onBookNow() {
  if (!roomCode || !urusan.trim()) return;
  const p = parseLocalInput(tarikhPergi);
  const day = p ? formatInTimeZone(p, TZ, "yyyy-MM-dd") : null;
  if (!day) return;
  const kind = attended; // "AM" | "PM" | "FULL" | "NONE"
  startTransition(async () => {
    const res = await bookRoom({
      roomId: roomIdForCode(roomCode), // see note
      tarikh: day,
      title: urusan.trim(),
      fullDay: kind === "FULL",
      slot: kind === "PM" ? "PM" : "AM",
    });
    if (!res.ok) { setError(res.error); return; }
    // reload cadangan so the new booking appears and mode C engages
    setOkMsg("Tempahan bilik dibuat.");
    router.refresh();
  });
}
```

Note on `roomIdForCode`: `bookRoom` needs a numeric `roomId`. The form does not have room ids. Two options — pick one and implement:
- **(chosen)** Pass `rooms` (id+code) into `PergerakanForm` as a prop from its server page (`app/(app)/new/page.tsx`) via `listRooms()`, and map `roomCode → id`.
- Alternative: add a thin server action `bookRoomByCode(roomCode, …)` in `lib/actions/rooms.ts` that resolves the id. (Only if threading the prop is awkward.)

Implement the chosen option: in `app/(app)/new/page.tsx` import `listRooms`, pass `rooms={await listRooms()}`; in the form accept `rooms: {id:number;code:string}[]` and `roomIdForCode = (code) => rooms.find(r => r.code === code)?.id`. Guard `onBookNow` when id is missing.

Finally, delete the now-orphaned `checkPergerakanRoomAvailability` export from `lib/actions/pergerakan.ts` and its `previewRoomBookingsForPergerakan` import (the form no longer calls it).

- [ ] **Step 7: Verify (typecheck, lint, manual)**

Run: `npx tsc --noEmit && npx eslint "app/(app)/new/PergerakanForm.tsx" "app/(app)/new/page.tsx" lib/actions/pergerakan.ts lib/actions/rooms.ts`
Expected: clean.

Manual checklist (`npm run dev`, open `/new`):
1. Lokasi = a school, set a date → urusan locks "Mencari…", then unlocks; peer cadangan show (≤6 + "Lihat lagi"); can free-type. No OPR/room booking UI shown except the OPR checkbox.
2. Lokasi = Bilik Budiman, date with an existing booking → room cadangan list appears (AM/PM split, full-day merged, correct slot highlighted by time); urusan locked until a pick or "tiada dalam senarai" ticked.
3. Lokasi = Bilik Budiman, date with NO booking → amber reminder + "Tempah sekarang"; clicking it (with a urusan typed) creates the booking and the list then appears.
4. "Tidak perlu tulis OPR" ticked → submit succeeds; an OPR row with status TIADA exists (check /my or DB).
5. Submitting a Budiman/Bestari pergerakan creates **no** room booking by itself.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/new/PergerakanForm.tsx" "app/(app)/new/page.tsx" lib/actions/pergerakan.ts
git commit -m "Pergerakan form: drop booking UI, standalone OPR, two-source cadangan with soft gate + book-now"
```

---

## Task 6: Docs + final regression

**Files:**
- Modify: `AI_CONTEXT_LOG.md`

- [ ] **Step 1: Append a context-log entry** (Malay) summarizing: pergerakan no longer books; standalone OPR checkbox; cadangan two sources (room bookings AM/PM/full + same-day own-sektor-first peers, 6+Lihat lagi, soft gate, mode C for rooms, book-now); new files `lib/pergerakan-slot.ts`, ranking in `day-activity-templates.ts`; bug #5 residue deferred.

- [ ] **Step 2: Full regression**

Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add AI_CONTEXT_LOG.md
git commit -m "Docs: log pergerakan booking decouple + cadangan rework"
```

---

## Self-Review Notes (author)

- **Spec coverage:** §3.1 remove booking → Task 4 + Task 5 Step 1; §3.2 OPR checkbox → Task 4 + Task 5 Step 2; §3.3(a) room cadangan AM/PM/full + mode C + no-booking fallback + book-now → Task 3 Step 2, Task 5 Steps 3-6; §3.3(b) peers all-sektor/own-first/6+Lihat lagi/same-day → Task 2, Task 3 Step 1, Task 5 Steps 3,5; §3.3.1 soft gate → Task 5 Steps 4,6; pure helpers + tests → Tasks 1,2; #5 scope note → Task 6.
- **Open implementation choice:** `roomId` for `bookRoom` — resolved in Task 5 Step 6 by threading `listRooms()` from the page (chosen) with a server-action fallback noted.
- **No new migration** is required by this plan.
