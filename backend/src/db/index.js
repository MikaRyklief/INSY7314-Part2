import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { config } from '../config.js';

sqlite3.verbose();

const dbDirectory = path.dirname(config.dbPath);
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

export const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    // Fail fast if database cannot initialize
    throw err;
  }
});

export const initializeDatabase = () => {
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL;');
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        id_number TEXT NOT NULL UNIQUE,
        account_number TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        provider TEXT NOT NULL,
        beneficiary_account TEXT NOT NULL,
        swift_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      );
    `);
  });

  ensureEmployeesTable((err) => {
    if (err) {
      throw err;
    }
    seedEmployees();
  });
};

const ensureEmployeesTable = (callback) => {
  db.all('PRAGMA table_info(employees);', (err, columns) => {
    if (err) {
      callback(err);
      return;
    }

    const expectedColumns = new Set(['id', 'full_name', 'employee_id', 'password_hash', 'created_at']);
    const columnNames = columns.map((column) => column.name);
    const hasExpectedSchema = columns.length > 0 && [...expectedColumns].every((col) => columnNames.includes(col));

    if (hasExpectedSchema) {
      callback(null);
      return;
    }

    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS employees;', (dropErr) => {
        if (dropErr) {
          callback(dropErr);
          return;
        }
        db.run(`
          CREATE TABLE employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            employee_id TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `, (createErr) => {
          if (createErr) {
            callback(createErr);
            return;
          }
          callback(null);
        });
      });
    });
  });
};

const DEFAULT_EMPLOYEES = [
  {
    fullName: 'International Operations Officer',
    employeeId: 'OPS001',
    passwordHash: '$2b$12$8Zb8zu9ERXpufwYHgHN/aOygBgMUSCB1dKqKKFljf8kd/gc.0IaAS'
  }
];

const seedEmployees = () => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO employees (full_name, employee_id, password_hash)
    VALUES (?, ?, ?);
  `);

  DEFAULT_EMPLOYEES.forEach((employee) => {
    stmt.run([employee.fullName, employee.employeeId, employee.passwordHash]);
  });
  stmt.finalize();
};

export const createCustomer = ({ fullName, idNumber, accountNumber, passwordHash }) => new Promise((resolve, reject) => {
  const stmt = db.prepare(`
    INSERT INTO customers (full_name, id_number, account_number, password_hash)
    VALUES (?, ?, ?, ?);
  `);

  stmt.run([fullName, idNumber, accountNumber, passwordHash], function runCallback(err) {
    stmt.finalize();
    if (err) {
      reject(err);
      return;
    }
    resolve({ id: this.lastID });
  });
});

export const findCustomerByCredentials = ({ idNumber, accountNumber }) => new Promise((resolve, reject) => {
  db.get(`
    SELECT id, full_name AS fullName, id_number AS idNumber, account_number AS accountNumber, password_hash AS passwordHash
    FROM customers
    WHERE id_number = ? AND account_number = ?
  `, [idNumber, accountNumber], (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row || null);
  });
});

export const findCustomerById = (customerId) => new Promise((resolve, reject) => {
  db.get(`
    SELECT id, full_name AS fullName, id_number AS idNumber, account_number AS accountNumber
    FROM customers
    WHERE id = ?
  `, [customerId], (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row || null);
  });
});

export const createPayment = ({ customerId, amount, currency, provider, beneficiaryAccount, swiftCode }) => new Promise((resolve, reject) => {
  const stmt = db.prepare(`
    INSERT INTO payments (customer_id, amount, currency, provider, beneficiary_account, swift_code)
    VALUES (?, ?, ?, ?, ?, ?);
  `);

  stmt.run([customerId, amount, currency, provider, beneficiaryAccount, swiftCode], function runCallback(err) {
    stmt.finalize();
    if (err) {
      reject(err);
      return;
    }
    resolve({ id: this.lastID });
  });
});

export const listPaymentsForCustomer = (customerId) => new Promise((resolve, reject) => {
  db.all(`
    SELECT
      id,
      amount,
      currency,
      provider,
      beneficiary_account AS beneficiaryAccount,
      swift_code AS swiftCode,
      status,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM payments
    WHERE customer_id = ?
    ORDER BY created_at DESC;
  `, [customerId], (err, rows) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(rows || []);
  });
});

export const findPaymentById = (paymentId) => new Promise((resolve, reject) => {
  db.get(`
    SELECT
      id,
      customer_id AS customerId,
      amount,
      currency,
      provider,
      beneficiary_account AS beneficiaryAccount,
      swift_code AS swiftCode,
      status,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM payments
    WHERE id = ?;
  `, [paymentId], (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row || null);
  });
});

export const findEmployeeByCredentials = ({ employeeId }) => new Promise((resolve, reject) => {
  db.get(`
    SELECT
      id,
      full_name AS fullName,
      employee_id AS employeeId,
      password_hash AS passwordHash
    FROM employees
    WHERE UPPER(employee_id) = UPPER(?)
  `, [employeeId], (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row || null);
  });
});

export const findEmployeeById = (employeeId) => new Promise((resolve, reject) => {
  db.get(`
    SELECT
      id,
      full_name AS fullName,
      employee_id AS employeeId
    FROM employees
    WHERE id = ?
  `, [employeeId], (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row || null);
  });
});

export const listPaymentsForReview = () => new Promise((resolve, reject) => {
  db.all(`
    SELECT
      p.id,
      p.amount,
      p.currency,
      p.provider,
      p.beneficiary_account AS beneficiaryAccount,
      p.swift_code AS swiftCode,
      p.status,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      c.full_name AS customerName,
      c.account_number AS customerAccountNumber
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    ORDER BY p.created_at DESC;
  `, [], (err, rows) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(rows || []);
  });
});

export const findPaymentForReview = (paymentId) => new Promise((resolve, reject) => {
  db.get(`
    SELECT
      p.id,
      p.customer_id AS customerId,
      p.amount,
      p.currency,
      p.provider,
      p.beneficiary_account AS beneficiaryAccount,
      p.swift_code AS swiftCode,
      p.status,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      c.full_name AS customerName,
      c.account_number AS customerAccountNumber
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    WHERE p.id = ?;
  `, [paymentId], (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row || null);
  });
});

export const updatePaymentStatus = ({ paymentId, status }) => new Promise((resolve, reject) => {
  const stmt = db.prepare(`
    UPDATE payments
    SET status = ?, updated_at = datetime('now')
    WHERE id = ?;
  `);

  stmt.run([status, paymentId], function runCallback(err) {
    stmt.finalize();
    if (err) {
      reject(err);
      return;
    }
    resolve({ changes: this.changes });
  });
});
