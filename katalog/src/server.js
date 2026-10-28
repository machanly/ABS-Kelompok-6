const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('./config');
const db = require('./db');
const { authenticate, requireRole, signToken, sendError } = require('./jwtAuth');

const app = express();
app.use(express.json());

const api = express.Router();

// Hash tiruan agar waktu respons login tidak membedakan "user tidak ada" vs "password salah".
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

// POST /api/v1/auth/login  (tanpa token)
api.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'username dan password wajib diisi (string).');
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  const ok = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
  }
  const token = signToken(user);
  return res.status(200).json({
    data: {
      access_token: token,
      token_type: 'Bearer',
      expires_in: config.jwtExpiresIn,
      user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    },
  });
});

const toFacility = (r) => ({
  id: r.id, name: r.name, category: r.category, description: r.description,
  location: r.location, capacity: r.capacity, is_active: r.is_active === 1,
});

// GET /api/v1/fasilitas?category=&page=&limit=   (mahasiswa & admin)
api.get('/fasilitas', authenticate, requireRole('mahasiswa', 'admin'), (req, res) => {
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

// GET /api/v1/fasilitas/:id   (mahasiswa & admin)
api.get('/fasilitas/:id', authenticate, requireRole('mahasiswa', 'admin'), (req, res) => {
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
