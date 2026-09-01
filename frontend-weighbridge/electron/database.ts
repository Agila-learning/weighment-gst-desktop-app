import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

let dbInstance: any = null;

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'weighbridge_offline.db');
  dbInstance = new Database(dbPath, { verbose: console.log });

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gstin TEXT
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      vehicleNumber TEXT NOT NULL,
      tareWeight REAL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transporters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weighments (
      id TEXT PRIMARY KEY,
      slipNumber TEXT,
      vehicleId TEXT,
      vehicleNumber TEXT,
      customerId TEXT,
      customerName TEXT,
      materialId TEXT,
      materialName TEXT,
      driverId TEXT,
      driverName TEXT,
      transporterId TEXT,
      transporterName TEXT,
      firstWeight REAL,
      secondWeight REAL,
      netWeight REAL,
      pricingType TEXT,
      rate REAL,
      billingUnit TEXT,
      calculatedQuantity REAL,
      calculatedAmount REAL,
      pricingSnapshot TEXT,
      status TEXT,
      syncStatus TEXT,
      date TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      loadType TEXT,
      firstWeightDate TEXT,
      secondWeightDate TEXT,
      firstWeightSource TEXT,
      secondWeightSource TEXT
    );
    
    CREATE TABLE IF NOT EXISTS local_sync_queue (
      id TEXT PRIMARY KEY,
      entityType TEXT,
      entityId TEXT,
      operation TEXT,
      payload TEXT,
      status TEXT,
      retryCount INTEGER DEFAULT 0,
      errorMessage TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      action TEXT,
      entity TEXT,
      entityId TEXT,
      details TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS auth_cache (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT,
      name TEXT,
      role TEXT,
      localHash TEXT,
      applicationAccess TEXT
    );
    CREATE TABLE IF NOT EXISTS customer_material_prices (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      materialId TEXT NOT NULL,
      pricingType TEXT,
      billingUnit TEXT,
      rate REAL,
      isActive INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS device_settings (
      id TEXT PRIMARY KEY,
      connectionType TEXT,
      comPort TEXT,
      baudRate INTEGER,
      dataBits INTEGER,
      parity TEXT,
      stopBits INTEGER,
      ipAddress TEXT,
      port INTEGER,
      readInterval INTEGER,
      connectionTimeout INTEGER,
      updatedAt TEXT
    );
  `);


    // Safe alter tables for backwards compatibility with existing DB
    const alters = [
      "ALTER TABLE weighments ADD COLUMN loadType TEXT",
      "ALTER TABLE weighments ADD COLUMN firstWeightDate TEXT",
      "ALTER TABLE weighments ADD COLUMN secondWeightDate TEXT",
      "ALTER TABLE weighments ADD COLUMN firstWeightSource TEXT",
      "ALTER TABLE weighments ADD COLUMN secondWeightSource TEXT",
      "ALTER TABLE weighments ADD COLUMN invoiceReference TEXT",
      "ALTER TABLE weighments ADD COLUMN cancellationReason TEXT",
      "ALTER TABLE weighments ADD COLUMN originalWeighmentId TEXT",
      "ALTER TABLE weighments ADD COLUMN isCorrection INTEGER DEFAULT 0",
      
      // Advanced Enhancements Additions
      "ALTER TABLE weighments ADD COLUMN pricingType TEXT",
      "ALTER TABLE weighments ADD COLUMN rate REAL",
      "ALTER TABLE weighments ADD COLUMN billingUnit TEXT",
      "ALTER TABLE weighments ADD COLUMN calculatedQuantity REAL",
      "ALTER TABLE weighments ADD COLUMN calculatedAmount REAL",
      "ALTER TABLE weighments ADD COLUMN pricingSnapshot TEXT",
      
      "ALTER TABLE materials ADD COLUMN pricingType TEXT",
      "ALTER TABLE materials ADD COLUMN billingUnit TEXT",
      "ALTER TABLE materials ADD COLUMN defaultRate REAL",
      
      "ALTER TABLE customers ADD COLUMN mobile1 TEXT",
      "ALTER TABLE customers ADD COLUMN mobile2 TEXT",
    ];
    for (const query of alters) {
      try {
        dbInstance.exec(query);
      } catch (e) {
        // Ignore "duplicate column name" errors
      }
    }

  return dbInstance;
}

export function executeQuery(query: string, params: any[] = []) {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  const stmt = dbInstance.prepare(query);
  if (query.trim().toUpperCase().startsWith('SELECT')) {
    return stmt.all(...params);
  } else {
    return stmt.run(...params);
  }
}
