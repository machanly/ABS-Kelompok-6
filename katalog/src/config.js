require('dotenv').config({ quiet: true });

// Konfigurasi dibaca dari environment; bila tidak ada, pakai nilai bawaan.
const config = {
  port: Number(process.env.PORT) || 3001,
  dbFile: process.env.DB_FILE || './data/katalog.db',
};

module.exports = config;
