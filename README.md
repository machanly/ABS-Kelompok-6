# Sistem Peminjaman Fasilitas Kampus Berorientasi Service

Tugas Kelompok mata kuliah Aplikasi Berorientasi Service.
Prototipe REST API peminjaman fasilitas kampus: **Layanan Katalog** dan **Layanan Peminjaman**
(dua proses terpisah, masing-masing dengan database sendiri), autentikasi JWT, serta otorisasi
berdasarkan peran dan kepemilikan data.

## Struktur folder

| Folder / berkas | Isi | Status |
|---|---|---|
| `KONTRAK_API.md` | Kesepakatan format, kode status, JWT, dan tujuh endpoint (acuan tim) | selesai |
| `katalog/` | Layanan Katalog (port 3001): data fasilitas, daftar dan detail. Login JWT menyusul | sebagian |
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
- [x] Layanan Katalog (fasilitas)
- [ ] Login, JWT, dan middleware
- [ ] Layanan Peminjaman
- [ ] Klien terminal
- [ ] Dokumentasi, laporan, dan hasil uji

## Cara menjalankan

Prasyarat: Node.js 18 atau lebih baru.

### Layanan Katalog (port 3001)
```bash
cd katalog
npm install
npm run seed     # buat/reset data awal (4 fasilitas)
npm start        # http://localhost:3001/api/v1
```

Coba di browser atau Postman (belum perlu token pada tahap ini):
- `GET http://localhost:3001/api/v1/fasilitas`
- `GET http://localhost:3001/api/v1/fasilitas?category=peralatan`
- `GET http://localhost:3001/api/v1/fasilitas/1`

Cara menjalankan layanan lain ditambahkan setelah layanannya selesai.
