const express = require('express');
const config = require('./config');
const db = require('./db');

const app = express();
app.use(express.json());

const api = express.Router();

// Format error yang sama untuk semua endpoint: { error: { status, code, message } }
function sendError(res, status, code, message) {
  return res.status(status).json({ error: { status, code, message } });
}

const toFacility = (r) => ({
  id: r.id, name: r.name, category: r.category, description: r.description,
  location: r.location, capacity: r.capacity, is_active: r.is_active === 1,
});

// Catatan: endpoint di bawah belum dilindungi JWT. Autentikasi dan otorisasi peran
// ditambahkan pada tahap berikutnya (modul login).

// GET /api/v1/fasilitas?category=&page=&limit=
api.get('/fasilitas', (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const { category } = req.query;
  const where = category ? 'WHERE category = ?' : '';
  const params = category ? [category] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM facilities ${where}`).get(...params).n;
  const rows = db
    .prepare(`SELECT * FROM facilities ${where} ORDER BY id LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);
  return res.status(200).json({ data: rows.map(toFacility), meta: { page, limit, total } });
});

// GET /api/v1/fasilitas/:id
api.get('/fasilitas/:id', (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'id fasilitas harus berupa bilangan bulat.');
  }
  const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(Number(req.params.id));
  if (!row) return sendError(res, 404, 'NOT_FOUND', 'Fasilitas tidak ditemukan.');
  return res.status(200).json({ data: toFacility(row) });
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

app.listen(config.port, () => console.log(`Katalog berjalan di http://localhost:${config.port}/api/v1`));
