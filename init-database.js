const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Tạo database mới
const db = new sqlite3.Database('./warehouse.db', (err) => {
  if (err) {
    console.error('❌ Lỗi tạo database:', err.message);
    return;
  }
  console.log('✅ Đã kết nối database warehouse.db');
});

// Bật foreign keys
db.run('PRAGMA foreign_keys = ON');

// Tạo bảng users
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    isActive BOOLEAN DEFAULT 1,
    lastLogin DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tạo bảng warehouses
db.run(`
  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Vietnam',
    phone TEXT,
    email TEXT,
    manager TEXT,
    totalArea REAL,
    usedArea REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    type TEXT DEFAULT 'general',
    rentalPrice REAL DEFAULT 0,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tạo bảng locations
db.run(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouseId INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'storage',
    area REAL,
    capacity REAL,
    status TEXT DEFAULT 'available',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id)
  )
`);

// Tạo bảng uoms (units of measure)
db.run(`
  CREATE TABLE IF NOT EXISTS uoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tạo bảng products
db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    manufacturer TEXT,
    category TEXT,
    uomId INTEGER,
    warehouseId INTEGER,
    locationId INTEGER,
    minStock REAL DEFAULT 0,
    maxStock REAL DEFAULT 999999,
    unitPrice REAL DEFAULT 0,
    notes TEXT,
    isActive BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uomId) REFERENCES uoms (id),
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id),
    FOREIGN KEY (locationId) REFERENCES locations (id)
  )
`);

// Tạo bảng transactions
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('inbound', 'outbound', 'transfer', 'adjustment', 'stocktake')),
    productId INTEGER NOT NULL,
    warehouseId INTEGER NOT NULL,
    locationId INTEGER,
    quantity REAL NOT NULL,
    unitPrice REAL DEFAULT 0,
    supplier TEXT,
    customer TEXT,
    reference TEXT,
    notes TEXT,
    transactionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products (id),
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id),
    FOREIGN KEY (locationId) REFERENCES locations (id)
  )
`);

// Tạo bảng customers
db.run(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contactPerson TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Vietnam',
    taxCode TEXT,
    creditLimit REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tạo bảng invoices
db.run(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceNumber TEXT UNIQUE NOT NULL,
    customerId INTEGER NOT NULL,
    invoiceDate DATE NOT NULL,
    dueDate DATE,
    subtotal REAL DEFAULT 0,
    taxRate REAL DEFAULT 0,
    taxAmount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers (id)
  )
`);

// Tạo bảng invoice_items
db.run(`
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceId INTEGER NOT NULL,
    productId INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unitPrice REAL NOT NULL,
    total REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (invoiceId) REFERENCES invoices (id),
    FOREIGN KEY (productId) REFERENCES products (id)
  )
`);

// Tạo bảng maintenance_plans
db.run(`
  CREATE TABLE IF NOT EXISTS maintenance_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouseId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'preventive',
    priority TEXT DEFAULT 'medium',
    plannedDate DATE NOT NULL,
    estimatedDuration INTEGER DEFAULT 1,
    estimatedCost REAL DEFAULT 0,
    responsibleStaff TEXT,
    status TEXT DEFAULT 'planned',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id)
  )
`);

// Tạo bảng maintenance_progress
db.run(`
  CREATE TABLE IF NOT EXISTS maintenance_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planId INTEGER NOT NULL,
    status TEXT NOT NULL,
    progressPercent INTEGER DEFAULT 0,
    actualStartDate DATETIME,
    actualEndDate DATETIME,
    actualCost REAL DEFAULT 0,
    notes TEXT,
    updatedBy TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (planId) REFERENCES maintenance_plans (id)
  )
`);

// Tạo bảng incidents
db.run(`
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouseId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'equipment',
    severity TEXT DEFAULT 'medium',
    reportedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    reporter TEXT,
    phone TEXT,
    status TEXT DEFAULT 'reported',
    action TEXT,
    resolvedAt DATETIME,
    resolvedBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouseId) REFERENCES warehouses (id)
  )
`);

// Tạo bảng maintenance_staff
db.run(`
  CREATE TABLE IF NOT EXISTS maintenance_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    position TEXT,
    specialty TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Tạo indexes để tối ưu hiệu suất
db.run('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
db.run('CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouseId)');
db.run('CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(productId)');
db.run('CREATE INDEX IF NOT EXISTS idx_transactions_warehouse ON transactions(warehouseId)');
db.run('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transactionDate)');
db.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
db.run('CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON locations(warehouseId)');
db.run('CREATE INDEX IF NOT EXISTS idx_maintenance_warehouse ON maintenance_plans(warehouseId)');

console.log('📋 Đang tạo dữ liệu mẫu...');

// Tạo dữ liệu mẫu cho UOMs
const uoms = [
  { name: 'Cái', code: 'CAI' },
  { name: 'Kg', code: 'KG' },
  { name: 'Mét', code: 'M' },
  { name: 'Lít', code: 'L' },
  { name: 'Hộp', code: 'HOP' },
  { name: 'Thùng', code: 'THUNG' }
];

uoms.forEach(uom => {
  db.run('INSERT OR IGNORE INTO uoms (name, code) VALUES (?, ?)', [uom.name, uom.code]);
});

// Tạo dữ liệu mẫu cho warehouses
const warehouses = [
  {
    name: 'Kho Hà Nội',
    code: 'HN001',
    address: '123 Đường ABC, Quận 1, Hà Nội',
    city: 'Hà Nội',
    phone: '024-1234-5678',
    email: 'hn@warehouse.com',
    manager: 'Nguyễn Văn A',
    totalArea: 5000,
    type: 'general',
    rentalPrice: 50000
  },
  {
    name: 'Kho TP.HCM',
    code: 'HCM001',
    address: '456 Đường XYZ, Quận 7, TP.HCM',
    city: 'TP.HCM',
    phone: '028-8765-4321',
    email: 'hcm@warehouse.com',
    manager: 'Trần Thị B',
    totalArea: 8000,
    type: 'cold',
    rentalPrice: 75000
  },
  {
    name: 'Kho Đà Nẵng',
    code: 'DN001',
    address: '789 Đường DEF, Quận Hải Châu, Đà Nẵng',
    city: 'Đà Nẵng',
    phone: '0236-1111-2222',
    email: 'dn@warehouse.com',
    manager: 'Lê Văn C',
    totalArea: 3000,
    type: 'hazardous',
    rentalPrice: 60000
  }
];

warehouses.forEach(warehouse => {
  db.run(`
    INSERT OR IGNORE INTO warehouses (name, code, address, city, phone, email, manager, totalArea, type, rentalPrice)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [warehouse.name, warehouse.code, warehouse.address, warehouse.city, warehouse.phone, 
       warehouse.email, warehouse.manager, warehouse.totalArea, warehouse.type, warehouse.rentalPrice]);
});

// Tạo dữ liệu mẫu cho locations
const locations = [
  { warehouseCode: 'HN001', code: 'A01', name: 'Khu A - Vị trí 01', type: 'storage', area: 100, capacity: 1000 },
  { warehouseCode: 'HN001', code: 'A02', name: 'Khu A - Vị trí 02', type: 'storage', area: 100, capacity: 1000 },
  { warehouseCode: 'HN001', code: 'B01', name: 'Khu B - Vị trí 01', type: 'storage', area: 150, capacity: 1500 },
  { warehouseCode: 'HCM001', code: 'A01', name: 'Khu A - Vị trí 01', type: 'storage', area: 200, capacity: 2000 },
  { warehouseCode: 'HCM001', code: 'A02', name: 'Khu A - Vị trí 02', type: 'storage', area: 200, capacity: 2000 },
  { warehouseCode: 'DN001', code: 'A01', name: 'Khu A - Vị trí 01', type: 'storage', area: 100, capacity: 1000 }
];

locations.forEach(location => {
  db.run(`
    INSERT OR IGNORE INTO locations (warehouseId, code, name, type, area, capacity)
    SELECT w.id, ?, ?, ?, ?, ?
    FROM warehouses w WHERE w.code = ?
  `, [location.code, location.name, location.type, location.area, location.capacity, location.warehouseCode]);
});

// Tạo dữ liệu mẫu cho products
const products = [
  {
    name: 'Laptop Dell Inspiron',
    sku: 'LAP-DELL-001',
    description: 'Laptop Dell Inspiron 15 inch, Intel i5',
    manufacturer: 'Dell Inc.',
    category: 'Electronics',
    warehouseCode: 'HN001',
    locationCode: 'A01',
    minStock: 10,
    maxStock: 100,
    unitPrice: 15000000
  },
  {
    name: 'Điện thoại Samsung Galaxy',
    sku: 'PHONE-SAMS-001',
    description: 'Điện thoại Samsung Galaxy S21',
    manufacturer: 'Samsung Electronics',
    category: 'Electronics',
    warehouseCode: 'HN001',
    locationCode: 'A02',
    minStock: 20,
    maxStock: 200,
    unitPrice: 20000000
  },
  {
    name: 'Bàn làm việc',
    sku: 'FURN-DESK-001',
    description: 'Bàn làm việc văn phòng, gỗ công nghiệp',
    manufacturer: 'Furniture Co.',
    category: 'Furniture',
    warehouseCode: 'HCM001',
    locationCode: 'A01',
    minStock: 5,
    maxStock: 50,
    unitPrice: 2500000
  },
  {
    name: 'Ghế văn phòng',
    sku: 'FURN-CHAIR-001',
    description: 'Ghế văn phòng có lưng tựa',
    manufacturer: 'Furniture Co.',
    category: 'Furniture',
    warehouseCode: 'HCM001',
    locationCode: 'A02',
    minStock: 15,
    maxStock: 100,
    unitPrice: 1500000
  },
  {
    name: 'Sách quản lý kho',
    sku: 'BOOK-WARE-001',
    description: 'Sách hướng dẫn quản lý kho hiệu quả',
    manufacturer: 'Publishing House',
    category: 'Books',
    warehouseCode: 'DN001',
    locationCode: 'A01',
    minStock: 50,
    maxStock: 500,
    unitPrice: 150000
  },
  {
    name: 'Máy in HP LaserJet',
    sku: 'PRINT-HP-001',
    description: 'Máy in laser HP LaserJet Pro M404n',
    manufacturer: 'HP Inc.',
    category: 'Electronics',
    warehouseCode: 'HN001',
    locationCode: 'B01',
    minStock: 8,
    maxStock: 80,
    unitPrice: 3500000
  },
  {
    name: 'Màn hình Dell 24"',
    sku: 'MON-DELL-001',
    description: 'Màn hình Dell 24 inch Full HD',
    manufacturer: 'Dell Inc.',
    category: 'Electronics',
    warehouseCode: 'HCM001',
    locationCode: 'A01',
    minStock: 12,
    maxStock: 120,
    unitPrice: 2800000
  },
  {
    name: 'Bàn ghế ăn',
    sku: 'FURN-DINING-001',
    description: 'Bộ bàn ghế ăn 6 người',
    manufacturer: 'Furniture Co.',
    category: 'Furniture',
    warehouseCode: 'DN001',
    locationCode: 'A01',
    minStock: 3,
    maxStock: 30,
    unitPrice: 4500000
  }
];

products.forEach(product => {
  db.run(`
    INSERT OR IGNORE INTO products (name, sku, description, manufacturer, category, minStock, maxStock, unitPrice, uomId, warehouseId, locationId)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, u.id, w.id, l.id
    FROM uoms u, warehouses w, locations l
    WHERE u.code = 'CAI' AND w.code = ? AND l.code = ?
    LIMIT 1
  `, [product.name, product.sku, product.description, product.manufacturer, product.category, 
       product.minStock, product.maxStock, product.unitPrice, product.warehouseCode, product.locationCode]);
});

// Tạo dữ liệu mẫu cho customers
const customers = [
  {
    name: 'Công ty TNHH ABC',
    code: 'CUST-001',
    contactPerson: 'Nguyễn Văn D',
    phone: '090-1234-5678',
    email: 'info@abc.com.vn',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    city: 'TP.HCM',
    taxCode: '0123456789'
  },
  {
    name: 'Công ty Cổ phần XYZ',
    code: 'CUST-002',
    contactPerson: 'Trần Thị E',
    phone: '091-8765-4321',
    email: 'contact@xyz.com.vn',
    address: '456 Đường XYZ, Quận 3, TP.HCM',
    city: 'TP.HCM',
    taxCode: '9876543210'
  },
  {
    name: 'Doanh nghiệp Tư nhân DEF',
    code: 'CUST-003',
    contactPerson: 'Lê Văn F',
    phone: '092-1111-2222',
    email: 'sales@def.com.vn',
    address: '789 Đường DEF, Quận Ba Đình, Hà Nội',
    city: 'Hà Nội',
    taxCode: '1122334455'
  }
];

customers.forEach(customer => {
  db.run(`
    INSERT OR IGNORE INTO customers (name, code, contactPerson, phone, email, address, city, taxCode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [customer.name, customer.code, customer.contactPerson, customer.phone, 
       customer.email, customer.address, customer.city, customer.taxCode]);
});

// Tạo dữ liệu mẫu cho users (admin)
const adminPassword = bcrypt.hashSync('admin123', 10);
db.run(`
  INSERT OR IGNORE INTO users (username, password, fullName, email, role)
  VALUES ('admin', ?, 'Administrator', 'admin@warehouse.com', 'admin')
`, [adminPassword]);

// Tạo dữ liệu mẫu cho transactions
const transactions = [
  // Nhập kho
  {
    type: 'inbound',
    productSku: 'LAP-DELL-001',
    warehouseCode: 'HN001',
    quantity: 50,
    unitPrice: 15000000,
    supplier: 'Dell Vietnam',
    reference: 'PO-001-2024'
  },
  {
    type: 'inbound',
    productSku: 'PHONE-SAMS-001',
    warehouseCode: 'HN001',
    quantity: 100,
    unitPrice: 20000000,
    supplier: 'Samsung Vietnam',
    reference: 'PO-002-2024'
  },
  {
    type: 'inbound',
    productSku: 'FURN-DESK-001',
    warehouseCode: 'HCM001',
    quantity: 30,
    unitPrice: 2500000,
    supplier: 'Furniture Co.',
    reference: 'PO-003-2024'
  },
  {
    type: 'inbound',
    productSku: 'FURN-CHAIR-001',
    warehouseCode: 'HCM001',
    quantity: 80,
    unitPrice: 1500000,
    supplier: 'Furniture Co.',
    reference: 'PO-004-2024'
  },
  {
    type: 'inbound',
    productSku: 'BOOK-WARE-001',
    warehouseCode: 'DN001',
    quantity: 200,
    unitPrice: 150000,
    supplier: 'Publishing House',
    reference: 'PO-005-2024'
  },
  
  // Xuất kho
  {
    type: 'outbound',
    productSku: 'LAP-DELL-001',
    warehouseCode: 'HN001',
    quantity: 10,
    unitPrice: 15000000,
    customer: 'Công ty TNHH ABC',
    reference: 'SO-001-2024'
  },
  {
    type: 'outbound',
    productSku: 'PHONE-SAMS-001',
    warehouseCode: 'HN001',
    quantity: 25,
    unitPrice: 20000000,
    customer: 'Công ty Cổ phần XYZ',
    reference: 'SO-002-2024'
  },
  {
    type: 'outbound',
    productSku: 'FURN-DESK-001',
    warehouseCode: 'HCM001',
    quantity: 8,
    unitPrice: 2500000,
    customer: 'Doanh nghiệp Tư nhân DEF',
    reference: 'SO-003-2024'
  },
  
  // Chuyển kho
  {
    type: 'transfer',
    productSku: 'LAP-DELL-001',
    warehouseCode: 'HN001',
    quantity: 15,
    unitPrice: 15000000,
    reference: 'TR-001-2024',
    notes: 'Chuyển kho từ HN sang HCM'
  },
  {
    type: 'transfer',
    productSku: 'PHONE-SAMS-001',
    warehouseCode: 'HN001',
    quantity: 20,
    unitPrice: 20000000,
    reference: 'TR-002-2024',
    notes: 'Chuyển kho từ HN sang DN'
  },
  
  // Điều chỉnh kho
  {
    type: 'adjustment',
    productSku: 'LAP-DELL-001',
    warehouseCode: 'HN001',
    quantity: 2,
    unitPrice: 0,
    reference: 'ADJ-001-2024',
    notes: 'Điều chỉnh do hao hụt'
  },
  {
    type: 'adjustment',
    productSku: 'FURN-CHAIR-001',
    warehouseCode: 'HCM001',
    quantity: -1,
    unitPrice: 0,
    reference: 'ADJ-002-2024',
    notes: 'Điều chỉnh do hư hỏng'
  },
  
  // Kiểm kê
  {
    type: 'stocktake',
    productSku: 'BOOK-WARE-001',
    warehouseCode: 'DN001',
    quantity: 5,
    unitPrice: 0,
    reference: 'ST-001-2024',
    notes: 'Kiểm kê định kỳ tháng 1'
  }
];

transactions.forEach(transaction => {
  // Xử lý các loại giao dịch khác nhau
  let supplier = transaction.supplier || null;
  let customer = transaction.customer || null;
  
  if (transaction.type === 'transfer') {
    // Chuyển kho: tạo cả inbound và outbound
    db.run(`
      INSERT OR IGNORE INTO transactions (type, productId, warehouseId, quantity, unitPrice, reference, notes, transactionDate)
      SELECT 'outbound', p.id, w.id, ?, ?, ?, ?, ?
      FROM products p, warehouses w
      WHERE p.sku = ? AND w.code = ?
    `, [transaction.quantity, transaction.unitPrice, transaction.reference, transaction.notes, 
         new Date().toISOString(), transaction.productSku, transaction.warehouseCode]);
    
    // Tạo giao dịch inbound cho kho đích (giả sử là HCM001)
    const targetWarehouse = transaction.warehouseCode === 'HN001' ? 'HCM001' : 'DN001';
    db.run(`
      INSERT OR IGNORE INTO transactions (type, productId, warehouseId, quantity, unitPrice, reference, notes, transactionDate)
      SELECT 'inbound', p.id, w.id, ?, ?, ?, ?, ?
      FROM products p, warehouses w
      WHERE p.sku = ? AND w.code = ?
    `, [transaction.quantity, transaction.unitPrice, transaction.reference, transaction.notes, 
         new Date().toISOString(), transaction.productSku, targetWarehouse]);
  } else {
    // Các loại giao dịch khác
    db.run(`
      INSERT OR IGNORE INTO transactions (type, productId, warehouseId, quantity, unitPrice, supplier, customer, reference, notes, transactionDate)
      SELECT ?, p.id, w.id, ?, ?, ?, ?, ?, ?, ?
      FROM products p, warehouses w
      WHERE p.sku = ? AND w.code = ?
    `, [transaction.type, transaction.quantity, transaction.unitPrice, supplier, customer, 
         transaction.reference, transaction.notes, new Date().toISOString(), 
         transaction.productSku, transaction.warehouseCode]);
  }
});

// Tạo dữ liệu mẫu cho maintenance staff
const maintenanceStaff = [
  {
    name: 'Nguyễn Văn Kỹ thuật',
    code: 'MT-001',
    position: 'Kỹ sư bảo trì',
    specialty: 'Điện tử, cơ khí',
    phone: '090-1111-2222',
    email: 'kythuat@warehouse.com'
  },
  {
    name: 'Trần Thị Bảo trì',
    code: 'MT-002',
    position: 'Kỹ thuật viên',
    specialty: 'Hệ thống làm lạnh',
    phone: '091-2222-3333',
    email: 'baotri@warehouse.com'
  }
];

maintenanceStaff.forEach(staff => {
  db.run(`
    INSERT OR IGNORE INTO maintenance_staff (name, code, position, specialty, phone, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [staff.name, staff.code, staff.position, staff.specialty, staff.phone, staff.email]);
});

// Tạo dữ liệu mẫu cho maintenance plans
const maintenancePlans = [
  {
    warehouseCode: 'HN001',
    title: 'Bảo trì hệ thống điện kho HN',
    description: 'Kiểm tra và bảo trì hệ thống điện định kỳ',
    type: 'preventive',
    priority: 'medium',
    plannedDate: '2024-02-15',
    estimatedDuration: 2,
    estimatedCost: 5000000,
    responsibleStaff: 'Nguyễn Văn Kỹ thuật'
  },
  {
    warehouseCode: 'HCM001',
    title: 'Bảo trì hệ thống làm lạnh',
    description: 'Bảo trì máy lạnh và hệ thống thông gió',
    type: 'preventive',
    priority: 'high',
    plannedDate: '2024-02-20',
    estimatedDuration: 3,
    estimatedCost: 8000000,
    responsibleStaff: 'Trần Thị Bảo trì'
  }
];

maintenancePlans.forEach(plan => {
  db.run(`
    INSERT OR IGNORE INTO maintenance_plans (warehouseId, title, description, type, priority, plannedDate, estimatedDuration, estimatedCost, responsibleStaff)
    SELECT w.id, ?, ?, ?, ?, ?, ?, ?, ?
    FROM warehouses w WHERE w.code = ?
  `, [plan.title, plan.description, plan.type, plan.priority, plan.plannedDate, 
       plan.estimatedDuration, plan.estimatedCost, plan.responsibleStaff, plan.warehouseCode]);
});

// Tạo dữ liệu mẫu cho incidents
const incidents = [
  {
    warehouseCode: 'HN001',
    title: 'Sự cố mất điện',
    description: 'Mất điện đột ngột tại kho HN',
    type: 'electrical',
    severity: 'high',
    reporter: 'Nguyễn Văn A',
    phone: '024-1234-5678'
  },
  {
    warehouseCode: 'HCM001',
    title: 'Máy lạnh bị hỏng',
    description: 'Máy lạnh chính bị hỏng, nhiệt độ tăng',
    type: 'equipment',
    severity: 'medium',
    reporter: 'Trần Thị B',
    phone: '028-8765-4321'
  }
];

incidents.forEach(incident => {
  db.run(`
    INSERT OR IGNORE INTO incidents (warehouseId, title, description, type, severity, reporter, phone)
    SELECT w.id, ?, ?, ?, ?, ?, ?
    FROM warehouses w WHERE w.code = ?
  `, [incident.title, incident.description, incident.type, incident.severity, 
       incident.reporter, incident.phone, incident.warehouseCode]);
});

console.log('✅ Đã tạo xong database và dữ liệu mẫu!');
console.log('📊 Thông tin đăng nhập:');
console.log('   Username: admin');
console.log('   Password: admin123');

// Đóng database
db.close((err) => {
  if (err) {
    console.error('❌ Lỗi đóng database:', err.message);
  } else {
    console.log('✅ Đã đóng database');
  }
});
