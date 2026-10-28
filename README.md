# Sistem Peminjaman Fasilitas Kampus Berorientasi Service

Tugas Kelompok mata kuliah Aplikasi Berorientasi Service.
Prototipe REST API peminjaman fasilitas kampus: **Layanan Katalog** dan **Layanan Peminjaman**
(dua proses terpisah, masing-masing dengan database sendiri), autentikasi JWT, serta otorisasi
berdasarkan peran dan kepemilikan data.

## Struktur folder

| Folder / berkas | Isi | Status |
|---|---|---|
| `KONTRAK_API.md` | Kesepakatan format, kode status, JWT, dan tujuh endpoint (acuan tim) | selesai |
| `katalog/` | Layanan Katalog + modul login JWT (port 3001) | belum |
| `peminjaman/` | Layanan Peminjaman (port 3002) | belum |
| `klien/` | Skrip klien terminal | belum |
| `pengujian/` | Skrip uji skenario U01-U10 | belum |
| `docs/` | Panduan dan dokumentasi API, laporan | belum |

## Teknologi
Node.js 18+, Express, SQLite, jsonwebtoken, bcryptjs.

## Anggota dan pembagian tugas

| Anggota | Pekerjaan |
|---|---|
| Rehan | Kerangka repo, klien terminal, panduan dan dokumentasi, laporan |
| Marchello | Layanan Katalog (data fasilitas, daftar dan detail) |
| Miracle | Modul login, bcrypt, JWT, middleware peran dan kepemilikan |
| Marcho | Layanan Peminjaman (POST, GET, PATCH) |

## Progres
- [x] Kerangka repo dan kontrak API
- [ ] Layanan Katalog
- [ ] Login, JWT, dan middleware
- [ ] Layanan Peminjaman
- [ ] Klien terminal
- [ ] Dokumentasi, laporan, dan hasil uji

## Cara menjalankan
Akan ditambahkan setelah kedua layanan selesai.
