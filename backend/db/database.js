const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'jobs.db');
let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function run(sql, params = []) {
  try {
    const stmt = getDB().prepare(sql);
    const result = stmt.run(...params);
    return Promise.resolve({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    return Promise.reject(err);
  }
}

function all(sql, params = []) {
  try {
    const stmt = getDB().prepare(sql);
    const rows = stmt.all(...params);
    return Promise.resolve(rows);
  } catch (err) {
    return Promise.reject(err);
  }
}

function get(sql, params = []) {
  try {
    const stmt = getDB().prepare(sql);
    const row = stmt.get(...params);
    return Promise.resolve(row);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function initDB() {
  await run(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    external_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    budget REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    skills TEXT DEFAULT '[]',
    status TEXT DEFAULT 'SCANNED',
    analysis TEXT DEFAULT '{}',
    solution TEXT DEFAULT '{}',
    proposal TEXT DEFAULT '',
    deliverable_url TEXT DEFAULT '',
    client_name TEXT DEFAULT '',
    client_id TEXT DEFAULT '',
    project_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    analyzed_at DATETIME,
    approved_at DATETIME,
    submitted_at DATETIME,
    completed_at DATETIME,
    paid_at DATETIME,
    earnings REAL DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    thread_id TEXT,
    sender TEXT NOT NULL,
    sender_type TEXT DEFAULT 'client',
    content TEXT NOT NULL,
    draft_reply TEXT DEFAULT '',
    reply_status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    replied_at DATETIME,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    jobs_scanned INTEGER DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    earnings REAL DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create indexes
  await run('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)');
  await run('CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform)');
  await run('CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(reply_status)');
}

module.exports = { initDB, run, all, get, getDB };
