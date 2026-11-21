const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbFile = process.env.DB_FILE || './server/data/pagevault.db';
const fullPath = path.resolve(__dirname, '..', dbFile);
fs.mkdirSync(path.dirname(fullPath), { recursive: true });
const db = new sqlite3.Database(fullPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes });
  }));
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}
async function initDb() {
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT NOT NULL,
    edition TEXT DEFAULT '', course TEXT NOT NULL, department TEXT NOT NULL,
    condition TEXT NOT NULL, owner_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','Reserved','Borrowed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL, borrower_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected','Returned')),
    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, due_date TEXT,
    returned_at TEXT, FOREIGN KEY(book_id) REFERENCES books(id),
    FOREIGN KEY(owner_id) REFERENCES users(id), FOREIGN KEY(borrower_id) REFERENCES users(id)
  )`);
  await run('CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)');
  await run('CREATE INDEX IF NOT EXISTS idx_requests_users ON requests(owner_id, borrower_id)');
}
module.exports = { db, run, get, all, initDb };
