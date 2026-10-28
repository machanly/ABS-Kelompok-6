const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(path.resolve(config.dbFile)), { recursive: true });
const db = new Database(path.resolve(config.dbFile));
db.pragma('journal_mode = WAL');

// facility_id & borrower_id hanya referensi ID (tanpa foreign key): datanya milik layanan lain.
db.exec(`
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER NOT NULL,
    borrower_id INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
    admin_note TEXT,
    processed_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_loans_facility ON loans (facility_id, status);
`);

module.exports = db;
