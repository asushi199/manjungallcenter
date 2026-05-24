/**
 * Muat .env.local (utama) dan .env (sandaran).
 * Next.js baca .env.local secara automatik; skrip tsx hanya baca .env
 * melainkan kita panggil ini terlebih dahulu.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

const root = process.cwd();
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });
