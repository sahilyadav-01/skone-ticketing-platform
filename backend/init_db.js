const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./skone_ticketing.db');

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function closeAsync() {
  return new Promise((resolve) => db.close(resolve));
}

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
    priority TEXT NOT NULL DEFAULT 'Low',
    error_code TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    assigned_tech TEXT,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(user_id),
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
  )`);

  // Seed sample users
  // Default demo passwords:
  // - alice@example.com / username: alice  -> Password: pass
  // - bob@example.com / username: bob      -> Password: pass
  // - tech1@skone.com / username: tech1   -> Password: pass
  const bcrypt = require('bcrypt');

  (async () => {
    try {
      const hashPassword = async (plain) => bcrypt.hash(String(plain), 10);

      const p1 = await hashPassword('pass');
      const p2 = p1;
      const p3 = p1;

      await runAsync(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('alice', 'alice@example.com', ?, 'Client')`,
        [p1]
      );
      await runAsync(
        `UPDATE users SET password_hash = ? WHERE username = 'alice'`,
        [p1]
      );
      await runAsync(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('bob', 'bob@example.com', ?, 'Client')`,
        [p2]
      );
      await runAsync(
        `UPDATE users SET password_hash = ? WHERE username = 'bob'`,
        [p2]
      );
      await runAsync(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('tech1', 'tech1@skone.com', ?, 'Support Engineer')`,
        [p3]
      );
      await runAsync(
        `UPDATE users SET password_hash = ? WHERE username = 'tech1'`,
        [p3]
      );

      // Seed demo admin user
      // - admin / admin@example.com -> Password: pass
      const pAdmin = await hashPassword('pass');
      await runAsync(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@example.com', ?, 'Admin')`,
        [pAdmin]
      );
      await runAsync(
        `UPDATE users SET password_hash = ? WHERE username = 'admin'`,
        [pAdmin]
      );

      // Reassign seeded assets to belong to the admin user
      // (so “admin in assets assign for user” works immediately for demo)
      const adminRowsRes = await runAsync(
        `SELECT user_id FROM users WHERE username = 'admin'`
      );
      const adminId = adminRowsRes?.[0]?.user_id;

      if (adminId) {
        await runAsync(`UPDATE assets SET client_id = ?`, [adminId]);
      }

      // Seed some assets for clients

      await runAsync(
        `INSERT OR IGNORE INTO assets (name, client_id, deployment_date, status) VALUES ('Dell Laptop - A1', 1, '2022-03-01', 'Active')`
      );
      await runAsync(
        `INSERT OR IGNORE INTO assets (name, client_id, deployment_date, status) VALUES ('Printer - HR-02', 1, '2021-06-12', 'Active')`
      );
      await runAsync(
        `INSERT OR IGNORE INTO assets (name, client_id, deployment_date, status) VALUES ('Workstation - B3', 2, '2023-01-15', 'Active')`
      );

      console.log('Database initialized');
    } finally {
      await closeAsync();
    }
  })();
});

// Ensure priority and subject columns exist on older DBs (safe to run repeatedly)
const db2 = new sqlite3.Database('./skone_ticketing.db');
db2.serialize(() => {
  db2.all("PRAGMA table_info('tickets')", (err, rows) => {
    if (err) {
      console.error('Failed to inspect tickets table schema:', err.message);
      db2.close();
      return;
    }

    const columns = rows.map((row) => row.name);
    if (!columns.includes('priority')) {
      db2.run("ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'Low'");
    }
    if (!columns.includes('subject')) {
      db2.run("ALTER TABLE tickets ADD COLUMN subject TEXT DEFAULT ''");
    }
    db2.close();
  });
});

