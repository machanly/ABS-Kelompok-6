// Reset + isi data awal fasilitas. Jalankan: npm run seed
const db = require('./db');

// [id, name, category, description, location, capacity, is_active]
const facilities = [
  [1, 'Aula Serbaguna Merdeka', 'ruangan', 'Aula untuk seminar dan acara besar, lengkap dengan panggung dan tata suara.', 'Gedung A, Lantai 1', 250, 1],
  [2, 'Laboratorium Multimedia', 'ruangan', 'Lab dengan 30 komputer dan perangkat penyuntingan audio-video.', 'Gedung C, Lantai 2', 30, 1],
  [3, 'Proyektor Portabel', 'peralatan', 'Proyektor HD portabel dengan kabel HDMI dan layar lipat.', 'Gudang Sarana, Gedung B', null, 1],
  [4, 'Ruang Diskusi Perpustakaan', 'ruangan', 'AC sedang diperbaiki, belum dapat dipinjam.', 'Perpustakaan, Lantai 2', 12, 0],
];

const reset = db.transaction(() => {
  db.exec('DELETE FROM facilities');
  const ins = db.prepare('INSERT INTO facilities (id,name,category,description,location,capacity,is_active) VALUES (?,?,?,?,?,?,?)');
  facilities.forEach((f) => ins.run(...f));
});

reset();
console.log(`Seed selesai: ${facilities.length} fasilitas.`);
