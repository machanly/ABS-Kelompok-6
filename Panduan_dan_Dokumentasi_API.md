# Panduan Menjalankan dan Dokumentasi API

**Sistem Peminjaman Fasilitas Kampus Berorientasi Service** — dua layanan REST (Katalog dan Peminjaman), autentikasi JWT, dan satu klien terminal.

## 1. Panduan menjalankan

### 1.1 Prasyarat
- Node.js **18 atau lebih baru** (memakai `fetch` bawaan) dan npm.
- Tidak perlu memasang database: data disimpan di berkas SQLite yang dibuat otomatis.
- Postman atau `curl` (opsional, untuk pengujian manual).

### 1.2 Struktur folder
```
source_code/
  KONTRAK_API.md     kesepakatan format/aturan (acuan tim)
  katalog/           Layanan Katalog + modul autentikasi   (port 3001)
  peminjaman/        Layanan Peminjaman                    (port 3002)
  klien/klien.js     skrip klien terminal
  pengujian/run_tests.js   10 skenario uji otomatis (U01-U10)
```

### 1.3 Instalasi dan konfigurasi
Lakukan di **kedua** folder layanan (`katalog/` dan `peminjaman/`):

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Isi `.env` (contoh nilai ada di `.env.example`, **tanpa secret asli**):

| Variabel | Katalog | Peminjaman | Keterangan |
|---|---|---|---|
| `PORT` | 3001 | 3002 | Port layanan |
| `JWT_SECRET` | wajib | wajib | String acak minimal 32 karakter. **Harus sama** di kedua layanan |
| `JWT_EXPIRES_IN` | 1h | 1h | Masa berlaku token |
| `DB_FILE` | `./data/katalog.db` | `./data/peminjaman.db` | Berkas database masing-masing layanan |
| `KATALOG_URL` | - | `http://localhost:3001/api/v1` | Alamat API Katalog yang dipanggil Peminjaman |
| `KATALOG_TIMEOUT_MS` | - | 3000 | Batas waktu panggilan ke Katalog |

### 1.4 Inisialisasi dan reset data
```bash
npm run seed     # jalankan di katalog/ dan di peminjaman/
```
- `katalog/`: mengisi ulang 4 fasilitas dan 3 akun uji.
- `peminjaman/`: mengosongkan semua pengajuan dan mengatur ID kembali ke 1.

Untuk **mengulang pengujian**, hentikan kedua layanan, jalankan `npm run seed` di kedua folder, lalu mulai layanan lagi.

### 1.5 Akun uji (data fiktif)

| Username | Password | Peran | ID |
|---|---|---|---|
| `admin` | `Admin#2026` | admin | 1 |
| `mhs_budi` | `Budi#2026` | mahasiswa | 2 |
| `mhs_citra` | `Citra#2026` | mahasiswa | 3 |

Peran ditetapkan oleh server melalui data awal; tidak ada registrasi.

### 1.6 Menjalankan layanan dan klien
Urutan: **Katalog dahulu**, lalu Peminjaman (dua terminal).

```bash
# Terminal 1
cd katalog && npm start         # http://localhost:3001/api/v1

# Terminal 2
cd peminjaman && npm start      # http://localhost:3002/api/v1

# Terminal 3: klien terminal (login -> katalog -> ajukan -> lihat pengajuan sendiri)
cd klien && node klien.js
node klien.js --user mhs_citra --pass 'Citra#2026' --fasilitas 2 \
  --mulai 2026-11-10T08:00:00Z --selesai 2026-11-10T10:00:00Z --tujuan "Praktikum"
node klien.js --help
```

Pengujian otomatis (data harus bersih, lihat 1.4):
```bash
node pengujian/run_tests.js            # ringkasan 10 skenario
node pengujian/run_tests.js --verbose  # + request/response tiap langkah
```
Operasi admin (menyetujui/menolak) didemonstrasikan lewat Postman atau `curl`, contohnya di bagian 4.3.

## 2. Ketentuan umum API

| Hal | Ketentuan |
|---|---|
| Base URL Katalog | `http://localhost:3001/api/v1` |
| Base URL Peminjaman | `http://localhost:3002/api/v1` |
| Header | `Accept: application/json`; `Content-Type: application/json` bila ada body |
| Format waktu | ISO 8601 UTC dengan akhiran `Z`, contoh `2026-11-10T08:00:00Z` (tanpa pecahan detik, tanpa offset seperti `+07:00`) |
| Respons sukses | `{ "data": ... }`; daftar: `{ "data": [...], "meta": { "page", "limit", "total" } }` |
| Respons error | `{ "error": { "status": 409, "code": "SCHEDULE_CONFLICT", "message": "..." } }` |

Respons tidak pernah memuat password, hash password, atau jejak internal server.

### 2.1 Cara memakai JWT
1. `POST /auth/login` dengan username dan password; ambil `data.access_token`.
2. Kirim token pada **setiap** request terlindungi, ke Katalog maupun Peminjaman:
   `Authorization: Bearer <access_token>`
3. Token berisi `sub` (ID pengguna), `username`, `role`, `iat`, dan `exp`. Algoritma HS256, berlaku 1 jam. Kedua layanan memverifikasi signature dan `exp`.
4. Token hilang, rusak, kedaluwarsa, atau dimodifikasi menghasilkan **401**. Peran atau kepemilikan yang tidak sesuai menghasilkan **403**.

### 2.2 Kode status

| Kode | Arti dalam sistem ini |
|---|---|
| 200 | Operasi berhasil |
| 201 | Pengajuan baru dibuat (disertai header `Location`) |
| 400 | Input tidak valid (`VALIDATION_ERROR`) |
| 401 | Kredensial/token tidak valid (`INVALID_CREDENTIALS`, `UNAUTHORIZED`) |
| 403 | Peran tidak sesuai atau bukan pemilik (`FORBIDDEN`) |
| 404 | ID tidak ada (`NOT_FOUND`) |
| 409 | Fasilitas nonaktif (`FACILITY_INACTIVE`), benturan jadwal (`SCHEDULE_CONFLICT`), atau transisi status tidak sah (`INVALID_TRANSITION`) |
| 503 | Katalog tidak dapat dihubungi saat membuat pengajuan (`CATALOG_UNAVAILABLE`) |

## 3. Spesifikasi tujuh endpoint

Path di bawah relatif terhadap `/api/v1` pada layanan pemiliknya.

| # | Pemilik | Method dan URL | Parameter / body (tipe, validasi) | Hak akses | Kode status |
|---|---|---|---|---|---|
| 1 | Katalog | `POST /auth/login` | Body: `username` (string, wajib), `password` (string, wajib) | Tanpa token | 200, 400, 401 |
| 2 | Katalog | `GET /fasilitas` | Query opsional: `category` (string), `page` (int >= 1, default 1), `limit` (int 1-100, default 10) | Mahasiswa, admin | 200, 401, 403 |
| 3 | Katalog | `GET /fasilitas/{id}` | Path: `id` (int) | Mahasiswa, admin | 200, 400, 401, 404 |
| 4 | Peminjaman | `POST /peminjaman` | Body: `facility_id` (int >= 1, wajib), `start_at` (string UTC `...Z`, wajib), `end_at` (string UTC, wajib, harus > `start_at`), `purpose` (string 1-200 karakter, wajib). `borrower_id` **tidak diterima**: diambil dari token | Mahasiswa | 201, 400, 401, 403, 404 (fasilitas tidak ada), 409 (nonaktif / bentrok), 503 |
| 5 | Peminjaman | `GET /peminjaman` | Query opsional: `status` (`pending`/`approved`/`rejected`), `page`, `limit` | Mahasiswa (milik sendiri), admin (semua) | 200, 400, 401 |
| 6 | Peminjaman | `GET /peminjaman/{id}` | Path: `id` (int) | Pemilik atau admin | 200, 400, 401, 403, 404 |
| 7 | Peminjaman | `PATCH /peminjaman/{id}` | Path: `id` (int). Body: `status` (`approved` atau `rejected`, wajib), `admin_note` (string maks. 200, opsional) | Admin | 200, 400, 401, 403, 404, 409 (bukan `pending`) |

### 3.1 Skema data

**Fasilitas** (milik Katalog)

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | integer | |
| `name` | string | Nama fasilitas |
| `category` | string | `ruangan` atau `peralatan` |
| `description` | string | |
| `location` | string | |
| `capacity` | integer / null | Null untuk peralatan |
| `is_active` | boolean | Hanya fasilitas aktif yang dapat dipinjam |

**Pengajuan** (milik Peminjaman)

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | integer | |
| `facility_id` | integer | Referensi ke fasilitas di Katalog |
| `borrower_id` | integer | Dari identitas token, tidak dapat diubah klien |
| `start_at`, `end_at` | string | UTC, `end_at` > `start_at` |
| `purpose` | string | 1-200 karakter |
| `status` | string | `pending` (awal), `approved`, `rejected` |
| `admin_note` | string / null | Catatan admin saat memproses |
| `processed_by` | integer / null | ID admin yang memproses |
| `created_at`, `updated_at` | string | UTC |

### 3.2 Aturan bisnis
- Pengajuan baru berstatus `pending`. Hanya `pending` yang dapat menjadi `approved` atau `rejected`; status akhir tidak dapat diubah (409).
- Bentrok: pada fasilitas yang sama, interval dengan pengajuan `pending`/`approved` bertumpang tindih bila `start_baru < end_lama` **dan** `end_baru > start_lama`. Interval yang hanya bertemu di batas diperbolehkan. Pengajuan `rejected` tidak memblokir jadwal.
- Fasilitas harus aktif saat pengajuan dibuat.

## 4. Contoh request dan response

Token dipotong dan disamarkan.

### 4.1 Login — `POST http://localhost:3001/api/v1/auth/login`

Request:
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "username": "mhs_budi", "password": "Budi#2026" }
```
Response `200 OK`:
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIi...",
    "token_type": "Bearer",
    "expires_in": "1h",
    "user": { "id": 2, "username": "mhs_budi", "role": "mahasiswa", "full_name": "Budi Santoso" }
  }
}
```
Password salah, response `401 Unauthorized`:
```json
{ "error": { "status": 401, "code": "INVALID_CREDENTIALS", "message": "Username atau password salah." } }
```

### 4.2 Membuat pengajuan — `POST http://localhost:3002/api/v1/peminjaman`

Request (peran mahasiswa):
```http
POST /api/v1/peminjaman
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "facility_id": 1,
  "start_at": "2026-11-10T08:00:00Z",
  "end_at": "2026-11-10T10:00:00Z",
  "purpose": "Rapat himpunan"
}
```
Response `201 Created` (header `Location: /api/v1/peminjaman/1`):
```json
{
  "data": {
    "id": 1,
    "facility_id": 1,
    "borrower_id": 2,
    "start_at": "2026-11-10T08:00:00Z",
    "end_at": "2026-11-10T10:00:00Z",
    "purpose": "Rapat himpunan",
    "status": "pending",
    "admin_note": null,
    "processed_by": null,
    "created_at": "2026-10-27T01:16:45Z",
    "updated_at": "2026-10-27T01:16:45Z"
  }
}
```
Jadwal bentrok, response `409 Conflict`:
```json
{ "error": { "status": 409, "code": "SCHEDULE_CONFLICT", "message": "Jadwal bentrok dengan pengajuan lain pada fasilitas yang sama." } }
```

### 4.3 Mengubah status — `PATCH http://localhost:3002/api/v1/peminjaman/1`

Request (token **admin**):
```http
PATCH /api/v1/peminjaman/1
Authorization: Bearer <access_token_admin>
Content-Type: application/json

{ "status": "approved", "admin_note": "Disetujui, kunci di satpam" }
```
Response `200 OK`:
```json
{
  "data": {
    "id": 1,
    "facility_id": 1,
    "borrower_id": 2,
    "start_at": "2026-11-10T08:00:00Z",
    "end_at": "2026-11-10T10:00:00Z",
    "purpose": "Rapat himpunan",
    "status": "approved",
    "admin_note": "Disetujui, kunci di satpam",
    "processed_by": 1,
    "created_at": "2026-10-27T01:16:45Z",
    "updated_at": "2026-10-27T01:16:46Z"
  }
}
```
Mahasiswa mencoba `PATCH`, response `403 Forbidden`:
```json
{ "error": { "status": 403, "code": "FORBIDDEN", "message": "Peran Anda tidak diizinkan untuk operasi ini." } }
```
Pengajuan yang sudah final diubah lagi, response `409 Conflict`:
```json
{ "error": { "status": 409, "code": "INVALID_TRANSITION", "message": "Pengajuan berstatus \"approved\" dan tidak dapat diubah lagi." } }
```

Contoh `curl`:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin#2026"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.access_token')

curl -X PATCH http://localhost:3002/api/v1/peminjaman/1 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"approved"}'
```

## 5. Bukti komunikasi antar layanan

Saat `POST /peminjaman`, layanan Peminjaman memanggil Katalog lewat HTTP dan meneruskan token pengguna. Kedua layanan mencatat log satu baris per request (token hanya 6 karakter terakhir):

```
[Peminjaman -> Katalog] GET http://localhost:3001/api/v1/fasilitas/1 -> 200 (61ms) Authorization: Bearer ***7VGLms
[Katalog] GET /api/v1/fasilitas/1 -> 200 (1ms) auth=Bearer ***7VGLms user=2(mahasiswa)
[Peminjaman] POST /api/v1/peminjaman -> 201 (82ms) auth=Bearer ***7VGLms user=2(mahasiswa)
```
Token yang sama muncul di kedua layanan, dan Katalog memverifikasinya sendiri (`user=2(mahasiswa)`).
