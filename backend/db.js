const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');

// Create SQLite database
const dbPath = path.join(__dirname, 'skone_ticketing.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Promisify for async/await
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));

// Custom run function
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Mock pool interface
const pool = {
  query: async (sql, params = []) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const rows = await dbAll(sql, params);
      return [rows];
    } else {
      const result = await dbRun(sql, params);
      return [{ insertId: result.lastID, affectedRows: result.changes }];
    }
  }
};

module.exports = pool;
