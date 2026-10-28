// Modul verifikasi JWT. Salinan IDENTIK dipakai di Katalog dan Peminjaman.
const jwt = require('jsonwebtoken');
const config = require('./config');

const ALGORITHM = 'HS256'; // ditetapkan server, tidak dibaca dari header token

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { status, code, message } });
}

// Verifikasi signature + exp. Token hilang/rusak/kedaluwarsa/dimodifikasi -> 401.
function authenticate(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token tidak ditemukan. Gunakan header Authorization: Bearer <token>.');
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });
    req.user = { id: Number(payload.sub), username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token telah kedaluwarsa.' : 'Token tidak valid.';
    return sendError(res, 401, 'UNAUTHORIZED', msg);
  }
}

// Otorisasi berbasis peran -> 403 bila peran tidak sesuai.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'FORBIDDEN', 'Peran Anda tidak diizinkan untuk operasi ini.');
    }
    return next();
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    config.jwtSecret,
    { algorithm: ALGORITHM, expiresIn: config.jwtExpiresIn }
  );
}

module.exports = { authenticate, requireRole, signToken, sendError };
