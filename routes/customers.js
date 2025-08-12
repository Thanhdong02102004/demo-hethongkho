const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả khách hàng
router.get('/', (req, res) => {
  const query = `
    SELECT c.*, 
           COUNT(DISTINCT i.id) as totalInvoices,
           COALESCE(SUM(i.total), 0) as totalRevenue
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customerId
    GROUP BY c.id
    ORDER BY c.name
  `;
  
  db.all(query, [], (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(customers);
  });
});

// Lấy khách hàng theo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT c.*, 
           COUNT(DISTINCT i.id) as totalInvoices,
           COALESCE(SUM(i.total), 0) as totalRevenue
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customerId
    WHERE c.id = ?
    GROUP BY c.id
  `;
  
  db.get(query, [id], (err, customer) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!customer) {
      return res.status(404).json({ error: 'Khách hàng không tồn tại' });
    }
    res.json(customer);
  });
});

// Tạo khách hàng mới
router.post('/', (req, res) => {
  const {
    name,
    code,
    contactPerson,
    phone,
    email,
    address,
    city,
    country,
    taxCode,
    creditLimit,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Tên và mã khách hàng là bắt buộc' });
  }

  const query = `
    INSERT INTO customers (
      name, code, contactPerson, phone, email, address, city, country,
      taxCode, creditLimit, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    name, code, contactPerson, phone, email, address, city, country || 'Vietnam',
    taxCode, creditLimit || 0, notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã khách hàng đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi tạo khách hàng' });
    }
    
    res.status(201).json({
      message: 'Tạo khách hàng thành công',
      customerId: this.lastID
    });
  });
});

// Cập nhật khách hàng
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    code,
    contactPerson,
    phone,
    email,
    address,
    city,
    country,
    taxCode,
    creditLimit,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Tên và mã khách hàng là bắt buộc' });
  }

  const query = `
    UPDATE customers SET
      name = ?, code = ?, contactPerson = ?, phone = ?, email = ?,
      address = ?, city = ?, country = ?, taxCode = ?, creditLimit = ?,
      notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    name, code, contactPerson, phone, email, address, city, country || 'Vietnam',
    taxCode, creditLimit || 0, notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã khách hàng đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi cập nhật khách hàng' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Khách hàng không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật khách hàng thành công' });
  });
});

// Xóa khách hàng
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Kiểm tra xem khách hàng có hóa đơn không
  db.get(
    'SELECT COUNT(*) as count FROM invoices WHERE customerId = ?',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi kiểm tra khách hàng' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Không thể xóa khách hàng đã có hóa đơn',
          invoiceCount: result.count
        });
      }

      // Xóa khách hàng
      db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi xóa khách hàng' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Khách hàng không tồn tại' });
        }
        
        res.json({ message: 'Xóa khách hàng thành công' });
      });
    }
  );
});

// Tìm kiếm khách hàng
router.get('/search/:keyword', (req, res) => {
  const { keyword } = req.params;
  const searchTerm = `%${keyword}%`;
  
  const query = `
    SELECT c.*, 
           COUNT(DISTINCT i.id) as totalInvoices,
           COALESCE(SUM(i.total), 0) as totalRevenue
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customerId
    WHERE c.name LIKE ? OR c.code LIKE ? OR c.contactPerson LIKE ? OR c.phone LIKE ?
    GROUP BY c.id
    ORDER BY c.name
  `;
  
  db.all(query, [searchTerm, searchTerm, searchTerm, searchTerm], (err, customers) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(customers);
  });
});

// Lấy lịch sử giao dịch của khách hàng
router.get('/:id/transactions', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT t.*, 
           p.name as productName,
           p.sku as productSku,
           w.name as warehouseName
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    WHERE t.customer = (SELECT name FROM customers WHERE id = ?)
    ORDER BY t.transactionDate DESC
  `;
  
  db.all(query, [id], (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(transactions);
  });
});

// Lấy hóa đơn của khách hàng
router.get('/:id/invoices', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT i.*, 
           COUNT(ii.id) as itemCount,
           SUM(ii.total) as calculatedTotal
    FROM invoices i
    LEFT JOIN invoice_items ii ON i.id = ii.invoiceId
    WHERE i.customerId = ?
    GROUP BY i.id
    ORDER BY i.invoiceDate DESC
  `;
  
  db.all(query, [id], (err, invoices) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(invoices);
  });
});

module.exports = router;
