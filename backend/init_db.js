const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./skone_ticketing.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS assets (
    asset_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_id INTEGER NOT NULL,
    deployment_date DATE,
    last_maintenance_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    asset_id INTEGER,
    issue_type TEXT NOT NULL,
    error_code TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    assigned_tech TEXT,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(user_id),
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
  )`);

  // Insert sample users
  db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('alice', 'alice@example.com', 'hash', 'Client')`);
  db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('bob', 'bob@example.com', 'hash', 'Client')`);
  db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('tech1', 'tech1@skone.com', 'hash', 'Support Engineer')`);

  console.log('Database initialized');
  db.close();
});