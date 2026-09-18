/**
 * Skrip Pembuat Bundel Migrasi Lengkap Otomatis
 * SIABDES Belega
 *
 * Menggabungkan seluruh file migrasi SQL di supabase/migrations/
 * secara berurutan sesuai urutan nama file (001 - 019+).
 */

import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const outputFile = path.resolve(process.cwd(), 'supabase/skema_lengkap_terbaru.sql');

if (!fs.existsSync(migrationsDir)) {
  console.error(`❌ Direktori migrasi tidak ditemukan: ${migrationsDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

console.log(`Menemukan ${files.length} file migrasi di ${migrationsDir}:`);
files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));

let combinedContent = `-- ====================================================================\n`
  + `-- SIABDES Belega - Skema Basis Data Lengkap Terbaru (Generated)\n`
  + `-- Dihasilkan otomatis dari seluruh file migrasi supabase/migrations/\n`
  + `-- Total file migrasi: ${files.length}\n`
  + `-- Tanggal pembuatan: ${new Date().toISOString()}\n`
  + `-- ====================================================================\n\n`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  combinedContent += `\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`;
  combinedContent += `-- BERKAS: ${file}\n`;
  combinedContent += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n`;
  combinedContent += content.trim() + `\n\n`;
}

fs.writeFileSync(outputFile, combinedContent, 'utf-8');
console.log(`\n✅ Berhasil menggabungkan ${files.length} migrasi ke: ${outputFile}`);
