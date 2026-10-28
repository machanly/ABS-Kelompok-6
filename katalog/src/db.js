const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

// Database milik layanan Katalog sendiri (satu berkas SQLite).
fs.mkdirSync(path.dirname(path.resolve(config.dbFile)), { recursive: true });
const db = new Database(path.resolve(config.dbFile));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS facilities (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity INTEGER,
    is_active INTEGER NOT NULL CHECK (is_active IN (0,1))
  );
`);

module.exports = db;
