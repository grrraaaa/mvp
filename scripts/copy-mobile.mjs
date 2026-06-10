/** Копирует сборку web mobile → frontend/public/m (для /m на Vercel и локально). */
import { cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "web mobile", "dist");
const dest = join(root, "frontend", "public", "m");

if (!existsSync(src)) {
  console.error("copy-mobile: нет папки", src, "— сначала npm run build --prefix \"web mobile\"");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log("copy-mobile: OK → frontend/public/m");
