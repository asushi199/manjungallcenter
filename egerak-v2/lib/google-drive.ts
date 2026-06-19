import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { Readable } from "stream";
import { google } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function resolveCredentialsPath(): string | null {
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim();
  if (!raw) return null;
  const path = resolve(process.cwd(), raw);
  return existsSync(path) ? path : null;
}

export function isDriveStorageConfigured(): boolean {
  return !!(process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() && resolveCredentialsPath());
}

function loadServiceAccount(credentialsPath: string) {
  const json = readFileSync(credentialsPath, "utf8");
  return JSON.parse(json) as {
    client_email: string;
    private_key: string;
  };
}

async function getDriveClient() {
  const credentialsPath = resolveCredentialsPath();
  if (!credentialsPath) {
    throw new Error(
      "Google Drive belum dikonfigurasi: set GOOGLE_DRIVE_FOLDER_ID dan GOOGLE_APPLICATION_CREDENTIALS (fail JSON service account).",
    );
  }

  const credentials = loadServiceAccount(credentialsPath);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [DRIVE_SCOPE],
  });

  return google.drive({ version: "v3", auth });
}

import { drivePhotoStoredPublicUrl } from "@/lib/opr-photo-url";
import { buildOprPhotoNaming, type OprPhotoMeta } from "@/lib/opr-photos";

/** URL untuk <img src> selepas fail dikongsi "anyone with link" */
export function driveImageViewUrl(fileId: string): string {
  return drivePhotoStoredPublicUrl(fileId);
}

export async function uploadOprPhotoToDrive(
  oprId: number,
  file: { name: string; type: string; buffer: Buffer },
  meta?: OprPhotoMeta,
): Promise<{ path: string; publicUrl: string; fileId: string }> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID tidak ditetapkan.");
  }

  const drive = await getDriveClient();
  const driveName = meta
    ? buildOprPhotoNaming(meta, file.name).fileName
    : `opr-${oprId}-${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const mimeType = file.type || "application/octet-stream";

  const created = await drive.files.create({
    requestBody: {
      name: driveName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(file.buffer),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error("Google Drive tidak mengembalikan ID fail.");
  }

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  return {
    fileId,
    path: `drive/${fileId}`,
    publicUrl: driveImageViewUrl(fileId),
  };
}
