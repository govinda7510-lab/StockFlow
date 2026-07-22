import * as SQLite from 'expo-sqlite';

const DB_NAME = 'stockflow.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY NOT NULL,
      shop_name TEXT NOT NULL DEFAULT '',
      contact_number TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'en',
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      price REAL,
      unit TEXT DEFAULT 'pcs',
      category TEXT DEFAULT 'General',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('add', 'deduct')),
      quantity REAL NOT NULL,
      balance_after REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );
  `);

  // Ensure at least one settings row exists
  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM settings WHERE id = 1'
  );
  if (!existing) {
    await database.runAsync(
      `INSERT INTO settings (id, shop_name, contact_number, language, onboarding_complete)
       VALUES (1, '', '', 'en', 0)`
    );
  }
};

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  id: number;
  shop_name: string;
  contact_number: string;
  language: string;
  onboarding_complete: number;
}

export const getSettings = async (): Promise<Settings | null> => {
  const database = await getDatabase();
  return database.getFirstAsync<Settings>('SELECT * FROM settings WHERE id = 1');
};

export const saveSettings = async (
  shopName: string,
  contactNumber: string,
  language?: string
): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE settings
     SET shop_name = ?, contact_number = ?, language = COALESCE(?, language),
         updated_at = datetime('now')
     WHERE id = 1`,
    shopName,
    contactNumber,
    language ?? null
  );
};

export const completeOnboarding = async (): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE settings SET onboarding_complete = 1, updated_at = datetime('now') WHERE id = 1`
  );
};

export const setLanguage = async (lang: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE settings SET language = ?, updated_at = datetime('now') WHERE id = 1`,
    lang
  );
};

// ─── Stock Items ─────────────────────────────────────────────────────────────

export interface StockItem {
  id: number;
  name: string;
  quantity: number;
  price: number | null;
  unit: string;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const getAllItems = async (): Promise<StockItem[]> => {
  const database = await getDatabase();
  return database.getAllAsync<StockItem>(
    'SELECT * FROM items ORDER BY name ASC'
  );
};

export const getItemById = async (id: number): Promise<StockItem | null> => {
  const database = await getDatabase();
  return database.getFirstAsync<StockItem>('SELECT * FROM items WHERE id = ?', id);
};

export const addItem = async (
  name: string,
  quantity: number,
  price: number | null,
  unit: string = 'pcs',
  category: string = 'General',
  notes: string | null = null
): Promise<number> => {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO items (name, quantity, price, unit, category, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    name,
    quantity,
    price,
    unit,
    category,
    notes
  );

  // Log transaction
  await database.runAsync(
    `INSERT INTO transactions (item_id, item_name, type, quantity, balance_after, note)
     VALUES (?, ?, 'add', ?, ?, 'Initial stock entry')`,
    result.lastInsertRowId,
    name,
    quantity,
    quantity
  );

  return result.lastInsertRowId;
};

export const updateItem = async (
  id: number,
  name: string,
  quantity: number,
  price: number | null,
  unit: string = 'pcs',
  category: string = 'General',
  notes: string | null = null
): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE items
     SET name = ?, quantity = ?, price = ?, unit = ?, category = ?, notes = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    name,
    quantity,
    price,
    unit,
    category,
    notes,
    id
  );
};

export const deductItem = async (
  id: number,
  amount: number,
  note: string = ''
): Promise<{ success: boolean; newQty: number }> => {
  const database = await getDatabase();
  const item = await getItemById(id);
  if (!item) return { success: false, newQty: 0 };

  const newQty = Math.max(0, item.quantity - amount);
  await database.runAsync(
    `UPDATE items SET quantity = ?, updated_at = datetime('now') WHERE id = ?`,
    newQty,
    id
  );

  await database.runAsync(
    `INSERT INTO transactions (item_id, item_name, type, quantity, balance_after, note)
     VALUES (?, ?, 'deduct', ?, ?, ?)`,
    id,
    item.name,
    amount,
    newQty,
    note || 'Stock dispatched'
  );

  return { success: true, newQty };
};

export const deleteItem = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM items WHERE id = ?', id);
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: number;
  item_id: number;
  item_name: string;
  type: 'add' | 'deduct';
  quantity: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

export const getTransactions = async (limit = 50): Promise<Transaction[]> => {
  const database = await getDatabase();
  return database.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?',
    limit
  );
};

// ─── Bulk Operations ──────────────────────────────────────────────────────────

export const clearAllItems = async (): Promise<void> => {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM items; DELETE FROM transactions;');
};

export const bulkInsertItems = async (
  items: Array<Omit<StockItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    for (const item of items) {
      await database.runAsync(
        `INSERT INTO items (name, quantity, price, unit, category, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        item.name,
        item.quantity,
        item.price,
        item.unit ?? 'pcs',
        item.category ?? 'General',
        item.notes ?? null
      );
    }
  });
};
