require('dotenv').config({ quiet: true });

const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  dbFile: process.env.DB_FILE || './data/katalog.db',
};

if (!config.jwtSecret || config.jwtSecret.length < 16) {
  console.error('JWT_SECRET belum diatur (min. 16 karakter). Salin .env.example ke .env.');
  process.exit(1);
}

module.exports = config;
