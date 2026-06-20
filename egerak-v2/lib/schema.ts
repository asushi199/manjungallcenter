import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  date,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const peranan = pgEnum("peranan", [
  "Admin",
  "Penyelia",
  "Timbalan_PPD",
  "Ketua_Unit",
  "Pengguna",
]);
export const jenis = pgEnum("jenis", ["Pergerakan", "Bercuti"]);
export const sourceEnum = pgEnum("source", ["web", "bulk"]);
export const roomSlot = pgEnum("room_slot", ["AM", "PM"]);
export const bookingStatus = pgEnum("booking_status", ["BOOKED", "CANCELLED"]);
export const oprStatusEnum = pgEnum("opr_status", ["TIADA", "DRAFT", "SIAP"]);

export const sektors = pgTable(
  "sektors",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    codeIdx: uniqueIndex("sektors_code_idx").on(t.code),
  }),
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    nama: text("nama").notNull(),
    jawatan: text("jawatan").notNull().default(""),
    sektorId: integer("sektor_id").references(() => sektors.id, { onDelete: "set null" }),
    /** Skop sektor Laporan OPR untuk Timbalan_PPD (ID sektor, tanpa Pegawai PPD). */
    laporanSektorIds: jsonb("laporan_sektor_ids").$type<number[]>().notNull().default([]),
    peranan: peranan("peranan").notNull().default("Pengguna"),
    /** Tetapan paparan kalendar (wujud untuk semua peranan / pengguna). */
    calendarWeekStartsOn: text("calendar_week_starts_on").notNull().default("mon"),
    calendarGridOrientation: text("calendar_grid_orientation").notNull().default("horizontal"),
    calendarDefaultView: text("calendar_default_view").notNull().default("month"),
    calendarColorPreset: text("calendar_color_preset").notNull().default("default"),
    aktif: boolean("aktif").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(t.username),
    aktifIdx: index("users_aktif_idx").on(t.aktif),
  }),
);

export const pergerakan = pgTable(
  "pergerakan",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sektorId: integer("sektor_id").references(() => sektors.id, { onDelete: "set null" }),
    jenis: jenis("jenis").notNull().default("Pergerakan"),
    urusan: text("urusan").notNull(),
    lokasi: text("lokasi").notNull().default(""),
    tarikhPergi: timestamp("tarikh_pergi", { withTimezone: true }).notNull(),
    tarikhKembali: timestamp("tarikh_kembali", { withTimezone: true }).notNull(),
    aktif: boolean("aktif").notNull().default(true),
    source: sourceEnum("source").notNull().default("web"),
    /** null = biasa; "tambahan" = aktiviti Takwim yang ditambah selepas rancangan tahunan. */
    takwimKategori: text("takwim_kategori"),
    takwimAktivitiId: integer("takwim_aktiviti_id").references(() => takwimAktiviti.id, {
      onDelete: "set null",
    }),
    roleDalamTakwim: text("role_dalam_takwim"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pergiIdx: index("pergerakan_pergi_idx").on(t.tarikhPergi),
    kembaliIdx: index("pergerakan_kembali_idx").on(t.tarikhKembali),
    userAktifIdx: index("pergerakan_user_aktif_idx").on(t.userId, t.aktif),
    sektorIdx: index("pergerakan_sektor_idx").on(t.sektorId),
    takwimKategoriIdx: index("pergerakan_takwim_kategori_idx").on(t.takwimKategori),
    takwimAktivitiIdx: index("pergerakan_takwim_aktiviti_idx").on(t.takwimAktivitiId),
    aktifRangeIdx: index("pergerakan_aktif_range_idx")
      .on(t.aktif, t.tarikhKembali, t.tarikhPergi)
      .where(sql`${t.aktif} = true`),
  }),
);

export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => users.id, { onDelete: "set null" }),
  filename: text("filename"),
  stats: jsonb("stats").$type<{ ok: number; error: number; skipped: number }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const takwimAktiviti = pgTable(
  "takwim_aktiviti",
  {
    id: serial("id").primaryKey(),
    sektorId: integer("sektor_id").references(() => sektors.id, { onDelete: "set null" }),
    urusan: text("urusan").notNull(),
    lokasi: text("lokasi").notNull().default(""),
    tarikhPergi: timestamp("tarikh_pergi", { withTimezone: true }).notNull(),
    tarikhKembali: timestamp("tarikh_kembali", { withTimezone: true }).notNull(),
    kategori: text("kategori").notNull().default("rancangan"),
    ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    importBatchId: integer("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    aktif: boolean("aktif").notNull().default(true),
    sourcePergerakanId: integer("source_pergerakan_id").references(
      (): AnyPgColumn => pergerakan.id,
      {
        onDelete: "set null",
      },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sektorIdx: index("takwim_aktiviti_sektor_idx").on(t.sektorId),
    ownerIdx: index("takwim_aktiviti_owner_idx").on(t.ownerUserId),
    aktifRangeIdx: index("takwim_aktiviti_aktif_range_idx")
      .on(t.aktif, t.tarikhKembali, t.tarikhPergi)
      .where(sql`${t.aktif} = true`),
    sourcePergerakanIdx: uniqueIndex("takwim_aktiviti_source_pergerakan_idx").on(
      t.sourcePergerakanId,
    ),
  }),
);

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    codeIdx: uniqueIndex("rooms_code_idx").on(t.code),
  }),
);

export const roomBookings = pgTable(
  "room_bookings",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    tarikh: date("tarikh").notNull(),
    slot: roomSlot("slot").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    pergerakanId: integer("pergerakan_id").references(() => pergerakan.id, {
      onDelete: "set null",
    }),
    takwimAktivitiId: integer("takwim_aktiviti_id").references(() => takwimAktiviti.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: bookingStatus("status").notNull().default("BOOKED"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    roomDateIdx: index("room_bookings_room_date_idx").on(t.roomId, t.tarikh),
    userIdx: index("room_bookings_user_idx").on(t.userId),
    takwimAktivitiIdx: index("room_bookings_takwim_aktiviti_idx").on(t.takwimAktivitiId),
    activeUnique: uniqueIndex("room_bookings_active_unique")
      .on(t.roomId, t.tarikh, t.slot)
      .where(sql`${t.status} = 'BOOKED'`),
  }),
);

export const opr = pgTable(
  "opr",
  {
    id: serial("id").primaryKey(),
    pergerakanId: integer("pergerakan_id")
      .notNull()
      .references(() => pergerakan.id, { onDelete: "cascade" }),
    status: oprStatusEnum("status").notNull().default("DRAFT"),
    sektorOverrideId: integer("sektor_override_id").references(() => sektors.id, {
      onDelete: "set null",
    }),
    /** Fokus OPR (klasifikasi wajib, bukan input AI) — untuk Analisis OPR. */
    fokus: text("fokus"),
    maklumatTambahan: text("maklumat_tambahan").default(""),
    sasaran: text("sasaran").default(""),
    notaPegawai: text("nota_pegawai").default(""),
    dapatan: text("dapatan").default(""),
    rumusan: text("rumusan").default(""),
    refleksi: text("refleksi").default(""),
    /** Snapshot input AI terakhir (Maklumat|Sasaran|Nota) — kunci semula Jana. */
    aiGenerateInputKey: text("ai_generate_input_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pergerakanIdx: uniqueIndex("opr_pergerakan_idx").on(t.pergerakanId),
  }),
);

export const oprPhotos = pgTable("opr_photos", {
  id: serial("id").primaryKey(),
  oprId: integer("opr_id")
    .notNull()
    .references(() => opr.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  publicUrl: text("public_url"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sektorsRelations = relations(sektors, ({ many }) => ({
  users: many(users),
  pergerakan: many(pergerakan),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  sektor: one(sektors, { fields: [users.sektorId], references: [sektors.id] }),
  pergerakan: many(pergerakan),
  roomBookings: many(roomBookings),
  takwimOwned: many(takwimAktiviti, { relationName: "takwimOwner" }),
  takwimCreated: many(takwimAktiviti, { relationName: "takwimCreator" }),
}));

export const pergerakanRelations = relations(pergerakan, ({ one }) => ({
  user: one(users, { fields: [pergerakan.userId], references: [users.id] }),
  sektor: one(sektors, { fields: [pergerakan.sektorId], references: [sektors.id] }),
  takwimAktiviti: one(takwimAktiviti, {
    fields: [pergerakan.takwimAktivitiId],
    references: [takwimAktiviti.id],
  }),
}));

export const takwimAktivitiRelations = relations(takwimAktiviti, ({ one, many }) => ({
  sektor: one(sektors, { fields: [takwimAktiviti.sektorId], references: [sektors.id] }),
  owner: one(users, {
    fields: [takwimAktiviti.ownerUserId],
    references: [users.id],
    relationName: "takwimOwner",
  }),
  createdBy: one(users, {
    fields: [takwimAktiviti.createdByUserId],
    references: [users.id],
    relationName: "takwimCreator",
  }),
  importBatch: one(importBatches, {
    fields: [takwimAktiviti.importBatchId],
    references: [importBatches.id],
  }),
  pergerakan: many(pergerakan),
  roomBookings: many(roomBookings),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookings: many(roomBookings),
}));

export const roomBookingsRelations = relations(roomBookings, ({ one }) => ({
  room: one(rooms, { fields: [roomBookings.roomId], references: [rooms.id] }),
  user: one(users, { fields: [roomBookings.userId], references: [users.id] }),
  pergerakan: one(pergerakan, {
    fields: [roomBookings.pergerakanId],
    references: [pergerakan.id],
  }),
  takwimAktiviti: one(takwimAktiviti, {
    fields: [roomBookings.takwimAktivitiId],
    references: [takwimAktiviti.id],
  }),
}));

export const oprRelations = relations(opr, ({ one, many }) => ({
  pergerakan: one(pergerakan, { fields: [opr.pergerakanId], references: [pergerakan.id] }),
  sektorOverride: one(sektors, {
    fields: [opr.sektorOverrideId],
    references: [sektors.id],
  }),
  photos: many(oprPhotos),
}));

export const oprPhotosRelations = relations(oprPhotos, ({ one }) => ({
  opr: one(opr, { fields: [oprPhotos.oprId], references: [opr.id] }),
}));

export type Sektor = typeof sektors.$inferSelect;
export type User = typeof users.$inferSelect;
export type Pergerakan = typeof pergerakan.$inferSelect;
export type TakwimAktiviti = typeof takwimAktiviti.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomBooking = typeof roomBookings.$inferSelect;
export type Opr = typeof opr.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type NewPergerakan = typeof pergerakan.$inferInsert;
