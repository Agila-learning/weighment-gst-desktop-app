var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},s=(n,r,s)=>(s=n==null?{}:e(i(n)),o(r||!n||!n.__esModule||!a.call(n,`default`)?t(s,`default`,{value:n,enumerable:!0}):s,n));let c=require("electron"),l=require("node:path");l=s(l);let u=require("node:url"),d=require("bcryptjs");d=s(d);let f=require("node:fs");f=s(f);let p=require("better-sqlite3");p=s(p);var m=null;function h(){let e=l.default.join(c.app.getPath(`userData`),`weighbridge_offline.db`);m=new p.default(e,{verbose:console.log}),m.exec(`
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
  `);for(let e of[`ALTER TABLE weighments ADD COLUMN loadType TEXT`,`ALTER TABLE weighments ADD COLUMN firstWeightDate TEXT`,`ALTER TABLE weighments ADD COLUMN secondWeightDate TEXT`,`ALTER TABLE weighments ADD COLUMN firstWeightSource TEXT`,`ALTER TABLE weighments ADD COLUMN secondWeightSource TEXT`,`ALTER TABLE weighments ADD COLUMN invoiceReference TEXT`,`ALTER TABLE weighments ADD COLUMN cancellationReason TEXT`,`ALTER TABLE weighments ADD COLUMN originalWeighmentId TEXT`,`ALTER TABLE weighments ADD COLUMN isCorrection INTEGER DEFAULT 0`,`ALTER TABLE weighments ADD COLUMN pricingType TEXT`,`ALTER TABLE weighments ADD COLUMN rate REAL`,`ALTER TABLE weighments ADD COLUMN billingUnit TEXT`,`ALTER TABLE weighments ADD COLUMN calculatedQuantity REAL`,`ALTER TABLE weighments ADD COLUMN calculatedAmount REAL`,`ALTER TABLE weighments ADD COLUMN pricingSnapshot TEXT`,`ALTER TABLE materials ADD COLUMN pricingType TEXT`,`ALTER TABLE materials ADD COLUMN billingUnit TEXT`,`ALTER TABLE materials ADD COLUMN defaultRate REAL`,`ALTER TABLE customers ADD COLUMN mobile1 TEXT`,`ALTER TABLE customers ADD COLUMN mobile2 TEXT`])try{m.exec(e)}catch{}return m}function g(e,t=[]){m||=h();let n=m.prepare(e);return e.trim().toUpperCase().startsWith(`SELECT`)?n.all(...t):n.run(...t)}var _=typeof __dirname<`u`?__dirname:l.default.dirname((0,u.fileURLToPath)(require("url").pathToFileURL(__filename).href));process.env.DIST=l.default.join(_,`../dist`),process.env.VITE_PUBLIC=c.app.isPackaged?process.env.DIST:l.default.join(process.env.DIST,`../public`);var v,y=process.env.VITE_DEV_SERVER_URL;function b(){v=new c.BrowserWindow({width:1200,height:800,webPreferences:{preload:l.default.join(_,`preload.cjs`),plugins:!0}}),v.webContents.on(`did-finish-load`,()=>{v?.webContents.send(`main-process-message`,new Date().toLocaleString())}),y?v.loadURL(y):v.loadFile(l.default.join(process.env.DIST||``,`index.html`))}c.app.whenReady().then(()=>{h(),c.ipcMain.handle(`db-query`,async(e,t,n=[])=>{try{return{success:!0,data:g(t,n)}}catch(e){return{success:!1,error:e.message}}}),c.ipcMain.handle(`db-transaction`,async(e,t)=>{try{let e=h();return{success:!0,data:e.transaction(t=>{let n=[];for(let r of t){let t=e.prepare(r.query);r.query.trim().toUpperCase().startsWith(`SELECT`)?n.push(t.all(...r.params||[])):n.push(t.run(...r.params||[]))}return n})(t)}}catch(e){return{success:!1,error:e.message}}}),c.ipcMain.handle(`verify-password`,async(e,t,n)=>{try{return{success:!0,isValid:await d.default.compare(t,n)}}catch(e){return{success:!1,error:e.message}}}),c.ipcMain.handle(`backup-db`,async()=>{try{let e=l.default.join(c.app.getPath(`userData`),`weighbridge_offline.db`);if(!v)return{success:!1,error:`No window`};let{canceled:t,filePath:n}=await c.dialog.showSaveDialog(v,{title:`Save Database Backup`,defaultPath:l.default.join(c.app.getPath(`documents`),`weighbridge_backup_${new Date().toISOString().split(`T`)[0]}.db`),filters:[{name:`SQLite Database`,extensions:[`db`]}]});return t||!n?{success:!1,error:`Cancelled`}:(f.default.copyFileSync(e,n),{success:!0,filePath:n})}catch(e){return{success:!1,error:e.message}}}),c.ipcMain.handle(`auto-backup-db`,async()=>{try{let e=l.default.join(c.app.getPath(`userData`),`weighbridge_offline.db`),t=l.default.join(c.app.getPath(`documents`),`Weighbridge_AutoBackups`);f.default.existsSync(t)||f.default.mkdirSync(t,{recursive:!0});let n=l.default.join(t,`auto_backup_${new Date().toISOString().split(`T`)[0]}.db`);return f.default.copyFileSync(e,n),{success:!0,filePath:n}}catch(e){return{success:!1,error:e.message}}}),c.ipcMain.handle(`restore-db`,async()=>{try{let e=l.default.join(c.app.getPath(`userData`),`weighbridge_offline.db`);if(!v)return{success:!1,error:`No window`};let{canceled:t,filePaths:n}=await c.dialog.showOpenDialog(v,{title:`Restore Database Backup`,filters:[{name:`SQLite Database`,extensions:[`db`]}],properties:[`openFile`]});return t||n.length===0||(await c.dialog.showMessageBox(v,{type:`warning`,buttons:[`Yes, Restore`,`Cancel`],title:`Confirm Restore`,message:`Are you sure you want to overwrite the current database? This action cannot be undone and the application will restart.`})).response!==0?{success:!1,error:`Cancelled`}:(f.default.copyFileSync(n[0],e),c.app.relaunch(),c.app.exit(0),{success:!0})}catch(e){return{success:!1,error:e.message}}}),b()}),c.app.on(`window-all-closed`,()=>{process.platform!==`darwin`&&(c.app.quit(),v=null)}),c.app.on(`activate`,()=>{c.BrowserWindow.getAllWindows().length===0&&b()});