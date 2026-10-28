// Reset data Peminjaman ke kondisi awal (kosong, ID mulai dari 1). Jalankan: npm run seed
const db = require('./db');

db.exec("DELETE FROM loans; DELETE FROM sqlite_sequence WHERE name = 'loans';");
console.log('Reset selesai: tabel loans dikosongkan, ID mulai dari 1.');
