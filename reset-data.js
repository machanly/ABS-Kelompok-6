#!/usr/bin/env node
// Mengembalikan data kedua layanan ke kondisi awal (untuk mengulang pengujian atau demo).
// Hentikan Katalog dan Peminjaman lebih dulu, lalu jalankan:  node reset-data.js
// Prasyarat: `npm install` sudah dijalankan di katalog/ dan peminjaman/.
const { spawnSync } = require('child_process');
const path = require('path');

let gagal = false;
for (const dir of ['katalog', 'peminjaman']) {
  console.log(`\n[reset] ${dir}: npm run seed`);
  const r = spawnSync('npm run seed', { cwd: path.join(__dirname, dir), stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    gagal = true;
    console.error(`[reset] ${dir}: GAGAL (sudah npm install dan membuat .env di folder itu?)`);
  }
}
console.log(gagal ? '\nReset tidak lengkap.' : '\nReset selesai. Mulai ulang kedua layanan.');
process.exit(gagal ? 1 : 0);
