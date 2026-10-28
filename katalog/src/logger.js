// Log satu baris per request (tanpa body, token disamarkan). Dipakai sebagai bukti HTTP.
module.exports = function requestLogger(service) {
  return (req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      const auth = req.get('Authorization');
      const tok = auth ? ` auth=Bearer ***${auth.slice(-6)}` : ' auth=-';
      const who = req.user ? ` user=${req.user.id}(${req.user.role})` : '';
      console.log(`[${service}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)${tok}${who}`);
    });
    next();
  };
};
