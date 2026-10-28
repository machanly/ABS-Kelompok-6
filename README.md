# Sistem Peminjaman Fasilitas Kampus Berorientasi Service

Tugas Kelompok mata kuliah Aplikasi Berorientasi Service.
Prototipe REST API peminjaman fasilitas kampus: **Layanan Katalog** dan **Layanan Peminjaman**
(dua proses terpisah, masing-masing dengan database sendiri), autentikasi JWT, serta otorisasi
berdasarkan peran dan kepemilikan data.

## Struktur folder

| Folder / berkas | Isi | Status |
|---|---|---|
| `KONTRAK_API.md` | Kesepakatan format, kode status, JWT, dan tujuh endpoint (acuan tim) | selesai |
| `katalog/` | Layanan Katalog (port 3001): data fasilitas, login, dan JWT | selesai |
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
- [x] Login, JWT, dan middleware
- [ ] Layanan Peminjaman
- [ ] Klien terminal
- [ ] Dokumentasi, laporan, dan hasil uji

## Cara menjalankan

Prasyarat: Node.js 18 atau lebih baru.

### Layanan Katalog dan login (port 3001)
```bash
cd katalog
npm install
cp .env.example .env     # Windows: copy .env.example .env, lalu isi JWT_SECRET
npm run seed             # buat/reset data awal (4 fasilitas, 3 akun)
npm start                # http://localhost:3001/api/v1
```
`JWT_SECRET` adalah string acak minimal 32 karakter dan **harus sama** di layanan Peminjaman nanti.

### Akun uji (data fiktif)

| Username | Password | Peran |
|---|---|---|
| `admin` | `Admin#2026` | admin |
| `mhs_budi` | `Budi#2026` | mahasiswa |
| `mhs_citra` | `Citra#2026` | mahasiswa |

### Mencoba (Postman atau curl)
1. `POST http://localhost:3001/api/v1/auth/login` dengan body JSON `{"username":"mhs_budi","password":"Budi#2026"}`. Ambil `data.access_token`.
2. `GET http://localhost:3001/api/v1/fasilitas` dengan header `Authorization: Bearer <access_token>`.
   Tanpa token, token rusak, atau token kedaluwarsa dijawab **401**.

Cara menjalankan layanan lain ditambahkan setelah layanannya selesai.
