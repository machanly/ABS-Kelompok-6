const express = require('express');
const config = require('./config');
const db = require('./db');
const requestLogger = require('./logger');
const { authenticate, requireRole, sendError } = require('./jwtAuth');
const katalog = require('./katalogClient');

const app = express();
app.use(requestLogger('Peminjaman'));
app.use(express.json());

const api = express.Router();

// ---------- util ----------
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/; // contoh: 2026-11-10T08:00:00Z
const STATUSES = ['pending', 'approved', 'rejected'];

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const isId = (v) => /^\d+$/.test(String(v));

function parseUtc(v) {
  if (typeof v !== 'string' || !ISO_UTC.test(v)) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.toISOString().replace('.000Z', 'Z') !== v) return null; // tolak 31 Feb, dst.
  return d;
}

const toLoan = (r) => ({
  id: r.id,
  facility_id: r.facility_id,
  borrower_id: r.borrower_id,
  start_at: r.start_at,
  end_at: r.end_at,
  purpose: r.purpose,
  status: r.status,
  admin_note: r.admin_note,
  processed_by: r.processed_by,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

const getLoan = (id) => db.prepare('SELECT * FROM loans WHERE id = ?').get(id);

// Cek bentrok + simpan dalam SATU transaksi sinkron (tanpa await di antaranya),
// sehingga dua request bersamaan tidak bisa sama-sama lolos.
const createLoan = db.transaction((d) => {
  const conflict = db
    .prepare(
      `SELECT id FROM loans
       WHERE facility_id = ? AND status IN ('pending','approved')
         AND start_at < ? AND end_at > ? LIMIT 1`
    )
    .get(d.facility_id, d.end_at, d.start_at); // start_baru < end_lama DAN end_baru > start_lama
  if (conflict) return null;
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO loans (facility_id, borrower_id, start_at, end_at, purpose, status, created_at, updated_at)
       VALUES (?,?,?,?,?,'pending',?,?)`
    )
    .run(d.facility_id, d.borrower_id, d.start_at, d.end_at, d.purpose, now, now);
  return getLoan(info.lastInsertRowid);
});

// ---------- POST /api/v1/peminjaman (mahasiswa) ----------
api.post('/peminjaman', authenticate, requireRole('mahasiswa'), async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (!body) return sendError(res, 400, 'VALIDATION_ERROR', 'Body harus berupa objek JSON.');

  const { facility_id: facilityId, start_at: startAt, end_at: endAt } = body;
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';

  if (!Number.isInteger(facilityId) || facilityId < 1) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'facility_id wajib berupa bilangan bulat positif.');
  }
  const start = parseUtc(startAt);
  const end = parseUtc(endAt);
  if (!start || !end) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'start_at dan end_at wajib berformat UTC, contoh 2026-11-10T08:00:00Z.');
  }
  if (end <= start) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'end_at harus sesudah start_at.');
  }
  if (purpose.length < 1 || purpose.length > 200) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'purpose wajib diisi (1-200 karakter).');
  }

  // Periksa fasilitas lewat HTTP ke Katalog, meneruskan token pengguna.
  let fasilitas;
  try {
    fasilitas = await katalog.getFasilitas(facilityId, req.get('Authorization'));
  } catch (err) {
    if (err instanceof katalog.CatalogUnavailableError) {
      return sendError(res, 503, 'CATALOG_UNAVAILABLE', 'Layanan Katalog tidak tersedia. Coba lagi nanti.');
    }
    throw err;
  }
  if (!fasilitas) return sendError(res, 404, 'NOT_FOUND', 'Fasilitas tidak ditemukan.');
  if (!fasilitas.is_active) return sendError(res, 409, 'FACILITY_INACTIVE', 'Fasilitas sedang tidak aktif.');

  const loan = createLoan({
    facility_id: facilityId,
    borrower_id: req.user.id, // dari token; borrower_id kiriman klien diabaikan
    start_at: startAt,
    end_at: endAt,
    purpose,
  });
  if (!loan) {
    return sendError(res, 409, 'SCHEDULE_CONFLICT', 'Jadwal bentrok dengan pengajuan lain pada fasilitas yang sama.');
  }
  res.set('Location', `/api/v1/peminjaman/${loan.id}`);
  return res.status(201).json({ data: toLoan(loan) });
});

// ---------- GET /api/v1/peminjaman?status=&page=&limit= ----------
api.get('/peminjaman', authenticate, requireRole('mahasiswa', 'admin'), (req, res) => {
  const { status } = req.query;
  if (status !== undefined && !STATUSES.includes(status)) {
    return sendError(res, 400, 'VALIDATION_ERROR', `status harus salah satu dari: ${STATUSES.join(', ')}.`);
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const conds = [];
  const params = [];
  if (req.user.role === 'mahasiswa') { conds.push('borrower_id = ?'); params.push(req.user.id); } // hanya milik sendiri
  if (status) { conds.push('status = ?'); params.push(status); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM loans ${where}`).get(...params).n;
  const rows = db
    .prepare(`SELECT * FROM loans ${where} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  return res.status(200).json({ data: rows.map(toLoan), meta: { page, limit, total } });
});

// ---------- GET /api/v1/peminjaman/:id (pemilik atau admin) ----------
api.get('/peminjaman/:id', authenticate, requireRole('mahasiswa', 'admin'), (req, res) => {
  if (!isId(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'id peminjaman harus berupa bilangan bulat.');
  const loan = getLoan(Number(req.params.id));
  if (!loan) return sendError(res, 404, 'NOT_FOUND', 'Pengajuan tidak ditemukan.');
  if (req.user.role !== 'admin' && loan.borrower_id !== req.user.id) {
    return sendError(res, 403, 'FORBIDDEN', 'Anda tidak berhak mengakses pengajuan ini.');
  }
  return res.status(200).json({ data: toLoan(loan) });
});

// ---------- PATCH /api/v1/peminjaman/:id (admin) ----------
api.patch('/peminjaman/:id', authenticate, requireRole('admin'), (req, res) => {
  if (!isId(req.params.id)) return sendError(res, 400, 'VALIDATION_ERROR', 'id peminjaman harus berupa bilangan bulat.');
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (!body) return sendError(res, 400, 'VALIDATION_ERROR', 'Body harus berupa objek JSON.');

  const { status } = body;
  if (status !== 'approved' && status !== 'rejected') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'status wajib bernilai "approved" atau "rejected".');
  }
  let note = null;
  if (body.admin_note !== undefined && body.admin_note !== null) {
    if (typeof body.admin_note !== 'string' || body.admin_note.length > 200) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'admin_note harus berupa string maksimal 200 karakter.');
    }
    note = body.admin_note.trim() || null;
  }

  const id = Number(req.params.id);
  const loan = getLoan(id);
  if (!loan) return sendError(res, 404, 'NOT_FOUND', 'Pengajuan tidak ditemukan.');
  if (loan.status !== 'pending') {
    return sendError(res, 409, 'INVALID_TRANSITION', `Pengajuan berstatus "${loan.status}" dan tidak dapat diubah lagi.`);
  }

  const info = db
    .prepare(`UPDATE loans SET status = ?, admin_note = ?, processed_by = ?, updated_at = ? WHERE id = ? AND status = 'pending'`)
    .run(status, note, req.user.id, nowIso(), id);
  if (info.changes === 0) {
    return sendError(res, 409, 'INVALID_TRANSITION', 'Pengajuan sudah diproses.');
  }
  return res.status(200).json({ data: toLoan(getLoan(id)) });
});

app.use('/api/v1', api);

app.use((req, res) => sendError(res, 404, 'NOT_FOUND', 'Endpoint tidak ditemukan.'));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Body bukan JSON yang valid.');
  }
  console.error(err); // detail internal hanya di log server
  return sendError(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server.');
});

app.listen(config.port, () => console.log(`Peminjaman berjalan di http://localhost:${config.port}/api/v1`));
