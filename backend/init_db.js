const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'skone_ticketing.db');
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function closeAsync() {
  return new Promise((resolve) => db.close(resolve));
}

(async () => {
  try {
    // Create tables sequentially
    await runAsync(`CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Client',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS assets (
      asset_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_id INTEGER NOT NULL,
      deployment_date DATE,
      last_maintenance_date DATE,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(user_id)
    )`);

    await runAsync(`CREATE TABLE IF NOT EXISTS tickets (
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

    // Ensure priority and subject columns exist on older DBs (safe to run repeatedly)
    const columnsRows = await allAsync("PRAGMA table_info('tickets')");
    const columns = columnsRows.map((row) => row.name);
    if (!columns.includes('priority')) {
      await runAsync("ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'Low'");
    }
    if (!columns.includes('subject')) {
      await runAsync("ALTER TABLE tickets ADD COLUMN subject TEXT DEFAULT ''");
    }

    // Seed sample users
    // Default demo passwords:
    // - alice@example.com / username: alice  -> Password: pass
    // - bob@example.com / username: bob      -> Password: pass
    // - tech1@skone.com / username: tech1   -> Password: pass
    const bcrypt = require('bcrypt');
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
    const adminRow = await getAsync(
      `SELECT user_id FROM users WHERE username = 'admin'`
    );
    const adminId = adminRow?.user_id;

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

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    await closeAsync();
  }
})();


