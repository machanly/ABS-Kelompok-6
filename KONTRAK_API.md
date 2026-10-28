# Kontrak API Bersama (disepakati seluruh anggota kelompok)

Dokumen ini adalah **sumber kebenaran** untuk Katalog, Peminjaman, dan klien.
Perubahan apa pun harus disepakati bersama lalu diperbarui di sini lebih dulu.

## 1. Konvensi umum

| Hal | Keputusan |
|---|---|
| Prefiks | `/api/v1` pada kedua layanan |
| Layanan Katalog (+ modul auth) | `http://localhost:3001` |
| Layanan Peminjaman | `http://localhost:3002` |
| Nama resource | `/fasilitas` dan `/peminjaman` (Bahasa Indonesia) |
| Nama field | Bahasa Inggris snake_case, mengikuti dokumen tugas (`facility_id`, `borrower_id`, `start_at`, `end_at`, `purpose`, `status`) |
| Header | `Accept: application/json`, `Content-Type: application/json` (bila ada body) |
| Format waktu | ISO 8601 **UTC dengan akhiran `Z`**, contoh `2026-11-10T08:00:00Z` (tanpa pecahan detik, tanpa offset seperti `+07:00`). Selain format ini -> 400 |
| Penyimpanan | Katalog: `katalog/data/katalog.db`; Peminjaman: `peminjaman/data/peminjaman.db` (SQLite terpisah) |
| ID | Bilangan bulat |

**Respons sukses**
```json
{ "data": { } }
```
Daftar: `{ "data": [ ], "meta": { "page": 1, "limit": 10, "total": 4 } }`

**Respons error** (konsisten di kedua layanan)
```json
{ "error": { "status": 409, "code": "SCHEDULE_CONFLICT", "message": "Penjelasan singkat." } }
```

| Status | `error.code` | Dipakai untuk |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid, JSON rusak, `end_at <= start_at`, format waktu salah |
| 401 | `INVALID_CREDENTIALS` / `UNAUTHORIZED` | Login salah / token hilang, rusak, kedaluwarsa, dimodifikasi |
| 403 | `FORBIDDEN` | Peran tidak sesuai atau bukan pemilik resource |
| 404 | `NOT_FOUND` | ID tidak ada |
| 409 | `FACILITY_INACTIVE` / `SCHEDULE_CONFLICT` / `INVALID_TRANSITION` | Fasilitas nonaktif / jadwal bentrok / transisi status tidak sah |
| 503 | `CATALOG_UNAVAILABLE` | Peminjaman tidak dapat menghubungi Katalog (mati/timeout). Hanya memengaruhi `POST /peminjaman` |

## 2. JWT

- Algoritma **HS256**, ditetapkan di server (`algorithms: ['HS256']` saat verify).
- Payload: `sub` (id pengguna, string), `username`, `role` (`admin` | `mahasiswa`), `iat`, `exp`.
- Masa berlaku default 1 jam (`JWT_EXPIRES_IN`).
- `JWT_SECRET` **harus sama** di `.env` Katalog dan Peminjaman. Jangan di-commit.
- Klien mengirim `Authorization: Bearer <token>` pada setiap endpoint terlindungi.
- Modul login berada di **layanan Katalog**. Peminjaman hanya memverifikasi token.
- File `jwtAuth.js` identik di kedua layanan (authenticate, requireRole).

## 3. Data awal (seed, fiktif)

Fasilitas (milik Katalog):

| id | name | category | location | capacity | is_active |
|---|---|---|---|---|---|
| 1 | Aula Serbaguna Merdeka | ruangan | Gedung A, Lantai 1 | 250 | true |
| 2 | Laboratorium Multimedia | ruangan | Gedung C, Lantai 2 | 30 | true |
| 3 | Proyektor Portabel | peralatan | Gudang Sarana, Gedung B | null | true |
| 4 | Ruang Diskusi Perpustakaan | ruangan | Perpustakaan, Lantai 2 | 12 | **false** (untuk uji 409) |

Akun uji:

| id | username | password | role |
|---|---|---|---|
| 1 | `admin` | `Admin#2026` | admin |
| 2 | `mhs_budi` | `Budi#2026` | mahasiswa |
| 3 | `mhs_citra` | `Citra#2026` | mahasiswa |

## 4. Tujuh endpoint

| # | Layanan | Method + path | Akses | Sukses |
|---|---|---|---|---|
| 1 | Katalog | `POST /api/v1/auth/login` | tanpa token | 200 |
| 2 | Katalog | `GET /api/v1/fasilitas?category=&page=&limit=` | mahasiswa, admin | 200 |
| 3 | Katalog | `GET /api/v1/fasilitas/{id}` | mahasiswa, admin | 200 |
| 4 | Peminjaman | `POST /api/v1/peminjaman` | mahasiswa saja | 201 |
| 5 | Peminjaman | `GET /api/v1/peminjaman` | mahasiswa (milik sendiri), admin (semua) | 200 |
| 6 | Peminjaman | `GET /api/v1/peminjaman/{id}` | pemilik atau admin | 200 |
| 7 | Peminjaman | `PATCH /api/v1/peminjaman/{id}` | admin saja | 200 |

### Login
Request: `{ "username": "mhs_budi", "password": "Budi#2026" }`
Response 200: `{ "data": { "access_token": "...", "token_type": "Bearer", "expires_in": "1h", "user": { "id": 2, "username": "mhs_budi", "role": "mahasiswa", "full_name": "Budi Santoso" } } }`

### Fasilitas
```json
{
  "id": 1,
  "name": "Aula Serbaguna Merdeka",
  "category": "ruangan",
  "description": "Aula untuk seminar dan acara besar, lengkap dengan panggung dan tata suara.",
  "location": "Gedung A, Lantai 1",
  "capacity": 250,
  "is_active": true
}
```

### Pengajuan peminjaman
```json
{
  "id": 1,
  "facility_id": 1,
  "borrower_id": 2,
  "start_at": "2026-11-10T08:00:00Z",
  "end_at": "2026-11-10T10:00:00Z",
  "purpose": "Rapat himpunan",
  "status": "pending",
  "admin_note": null,
  "processed_by": null,
  "created_at": "2026-10-27T03:00:00Z",
  "updated_at": "2026-10-27T03:00:00Z"
}
```

**POST /peminjaman** body: `facility_id` (int, wajib), `start_at` (wajib), `end_at` (wajib), `purpose` (string 1-200, wajib).
`borrower_id` **tidak diterima dari klien**; diambil dari `sub` pada token. Bila dikirim, diabaikan.

**PATCH /peminjaman/{id}** body: `status` (wajib: `approved` | `rejected`), `admin_note` (opsional, string maks. 200).
Saat diproses, server mengisi `processed_by` (id admin dari token) dan memperbarui `updated_at`.

**POST /peminjaman** sukses mengembalikan 201 beserta header `Location: /api/v1/peminjaman/{id}`.

**GET /peminjaman** menerima query opsional `status` (`pending|approved|rejected`), `page`, dan `limit` (maks. 100).

## 5. Urutan pemeriksaan (agar kode status konsisten)

**POST /peminjaman**: token (401) -> peran mahasiswa (403) -> validasi body & waktu (400) -> panggil Katalog `GET /fasilitas/{facility_id}` dengan **meneruskan header Authorization pengguna**: 404 bila fasilitas tidak ada (`NOT_FOUND`), 409 bila `is_active=false` (`FACILITY_INACTIVE`) -> cek bentrok jadwal (409 `SCHEDULE_CONFLICT`) -> simpan, 201.

**PATCH /peminjaman/{id}**: token (401) -> peran admin (403) -> validasi `status` (400) -> pengajuan ada (404) -> status saat ini `pending` (409 `INVALID_TRANSITION`) -> simpan, 200.

**GET /peminjaman/{id}**: token (401) -> pengajuan ada (404) -> pemilik atau admin (403). Pengajuan milik orang lain yang ID-nya ada -> **403**.

## 6. Aturan bisnis

- Status awal `pending`. Transisi sah hanya `pending -> approved` dan `pending -> rejected`. `approved` dan `rejected` bersifat final.
- Bentrok jadwal pada fasilitas yang sama dengan pengajuan berstatus `pending` atau `approved`:
  `start_baru < end_lama` **dan** `end_baru > start_lama`.
  Interval yang hanya bersentuhan (`end_lama == start_baru`) **diperbolehkan**.
- Pengajuan `rejected` tidak memblokir jadwal.
- `GET` tidak boleh mengubah data apa pun.
- Pembatalan, pengembalian, registrasi, serta tambah/ubah katalog di luar lingkup.

## 7. Kontrak panggilan antar layanan

Peminjaman -> Katalog: `GET http://localhost:3001/api/v1/fasilitas/{id}` dengan header `Authorization` yang sama dengan request pengguna.
Peminjaman hanya memakai field `id` dan `is_active` dari respons. Peminjaman tidak boleh membaca berkas/tabel Katalog secara langsung.

## 8. Log HTTP (bukti komunikasi antar layanan)

Kedua layanan mencetak satu baris log per request (tanpa body; token hanya 6 karakter terakhir):

```
[Peminjaman -> Katalog] GET http://localhost:3001/api/v1/fasilitas/1 -> 200 (59ms) Authorization: Bearer ***FnlAIM
[Katalog] GET /api/v1/fasilitas/1 -> 200 (6ms) auth=Bearer ***FnlAIM user=2(mahasiswa)
[Peminjaman] POST /api/v1/peminjaman -> 201 (82ms) auth=Bearer ***FnlAIM user=2(mahasiswa)
```
Token yang sama (`***FnlAIM`) muncul di Peminjaman dan Katalog: bukti token pengguna diteruskan dan diverifikasi ulang oleh Katalog.
