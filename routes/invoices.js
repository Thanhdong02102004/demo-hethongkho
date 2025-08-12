const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả hóa đơn
router.get('/', (req, res) => {
  const query = `
    SELECT i.*, 
           c.name as customerName,
           c.code as customerCode,
           COUNT(ii.id) as itemCount,
           SUM(ii.total) as calculatedTotal
    FROM invoices i
    LEFT JOIN customers c ON i.customerId = c.id
    LEFT JOIN invoice_items ii ON i.id = ii.invoiceId
    GROUP BY i.id
    ORDER BY i.invoiceDate DESC
  `;
  
  db.all(query, [], (err, invoices) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(invoices);
  });
});

// Lấy hóa đơn theo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Lấy thông tin hóa đơn
  const invoiceQuery = `
    SELECT i.*, c.name as customerName, c.code as customerCode
    FROM invoices i
    LEFT JOIN customers c ON i.customerId = c.id
    WHERE i.id = ?
  `;
  
  db.get(invoiceQuery, [id], (err, invoice) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!invoice) {
      return res.status(404).json({ error: 'Hóa đơn không tồn tại' });
    }
    
    // Lấy chi tiết hóa đơn
    const itemsQuery = `
      SELECT ii.*, p.name as productName, p.sku as productSku
      FROM invoice_items ii
      LEFT JOIN products p ON ii.productId = p.id
      WHERE ii.invoiceId = ?
    `;
    
    db.all(itemsQuery, [id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi database' });
      }
      
      invoice.items = items;
      res.json(invoice);
    });
  });
});

// Tạo hóa đơn mới
router.post('/', (req, res) => {
  const {
    invoiceNumber,
    customerId,
    invoiceDate,
    dueDate,
    taxRate,
    notes,
    items
  } = req.body;

  if (!invoiceNumber || !customerId || !invoiceDate || !items || items.length === 0) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  // Tính toán tổng tiền
  let subtotal = 0;
  items.forEach(item => {
    subtotal += item.quantity * item.unitPrice;
  });
  
  const taxAmount = subtotal * (taxRate || 0) / 100;
  const total = subtotal + taxAmount;

  // Tạo hóa đơn
  const invoiceQuery = `
    INSERT INTO invoices (
      invoiceNumber, customerId, invoiceDate, dueDate, subtotal,
      taxRate, taxAmount, total, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const invoiceParams = [
    invoiceNumber, customerId, invoiceDate, dueDate, subtotal,
    taxRate || 0, taxAmount, total, notes, now, now
  ];

  db.run(invoiceQuery, invoiceParams, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Số hóa đơn đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi tạo hóa đơn' });
    }

    const invoiceId = this.lastID;

    // Tạo chi tiết hóa đơn
    let itemsCreated = 0;
    items.forEach((item, index) => {
      const itemQuery = `
        INSERT INTO invoice_items (
          invoiceId, productId, quantity, unitPrice, total, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const itemTotal = item.quantity * item.unitPrice;
      const itemParams = [
        invoiceId, item.productId, item.quantity, item.unitPrice, itemTotal, item.notes
      ];

      db.run(itemQuery, itemParams, function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi tạo chi tiết hóa đơn' });
        }
        
        itemsCreated++;
        if (itemsCreated === items.length) {
          res.status(201).json({
            message: 'Tạo hóa đơn thành công',
            invoiceId: invoiceId,
            total: total
          });
        }
      });
    });
  });
});

// Cập nhật hóa đơn
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    invoiceNumber,
    customerId,
    invoiceDate,
    dueDate,
    taxRate,
    notes,
    items
  } = req.body;

  if (!invoiceNumber || !customerId || !invoiceDate || !items || items.length === 0) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  // Tính toán tổng tiền
  let subtotal = 0;
  items.forEach(item => {
    subtotal += item.quantity * item.unitPrice;
  });
  
  const taxAmount = subtotal * (taxRate || 0) / 100;
  const total = subtotal + taxAmount;

  // Cập nhật hóa đơn
  const invoiceQuery = `
    UPDATE invoices SET
      invoiceNumber = ?, customerId = ?, invoiceDate = ?, dueDate = ?,
      subtotal = ?, taxRate = ?, taxAmount = ?, total = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const invoiceParams = [
    invoiceNumber, customerId, invoiceDate, dueDate, subtotal,
    taxRate || 0, taxAmount, total, notes, now, id
  ];

  db.run(invoiceQuery, invoiceParams, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Số hóa đơn đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi cập nhật hóa đơn' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Hóa đơn không tồn tại' });
    }

    // Xóa chi tiết cũ
    db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Lỗi xóa chi tiết cũ' });
      }

      // Tạo chi tiết mới
      let itemsCreated = 0;
      items.forEach((item, index) => {
        const itemQuery = `
          INSERT INTO invoice_items (
            invoiceId, productId, quantity, unitPrice, total, notes
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const itemTotal = item.quantity * item.unitPrice;
        const itemParams = [
          id, item.productId, item.quantity, item.unitPrice, itemTotal, item.notes
        ];

        db.run(itemQuery, itemParams, function(err) {
          if (err) {
            return res.status(500).json({ error: 'Lỗi tạo chi tiết hóa đơn' });
          }
          
          itemsCreated++;
          if (itemsCreated === items.length) {
            res.json({ message: 'Cập nhật hóa đơn thành công' });
          }
        });
      });
    });
  });
});

// Xóa hóa đơn
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Xóa chi tiết hóa đơn trước
  db.run('DELETE FROM invoice_items WHERE invoiceId = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi xóa chi tiết hóa đơn' });
    }

    // Xóa hóa đơn
    db.run('DELETE FROM invoices WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Lỗi xóa hóa đơn' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Hóa đơn không tồn tại' });
      }
      
      res.json({ message: 'Xóa hóa đơn thành công' });
    });
  });
});

// Tìm kiếm hóa đơn
router.get('/search/:keyword', (req, res) => {
  const { keyword } = req.params;
  const searchTerm = `%${keyword}%`;
  
  const query = `
    SELECT i.*, 
           c.name as customerName,
           c.code as customerCode,
           COUNT(ii.id) as itemCount,
           SUM(ii.total) as calculatedTotal
    FROM invoices i
    LEFT JOIN customers c ON i.customerId = c.id
    LEFT JOIN invoice_items ii ON i.id = ii.invoiceId
    WHERE i.invoiceNumber LIKE ? OR c.name LIKE ? OR c.code LIKE ?
    GROUP BY i.id
    ORDER BY i.invoiceDate DESC
  `;
  
  db.all(query, [searchTerm, searchTerm, searchTerm], (err, invoices) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(invoices);
  });
});

// Lấy thống kê hóa đơn
router.get('/stats/summary', (req, res) => {
  const { startDate, endDate, customerId } = req.query;
  
  let query = `
    SELECT 
      COUNT(*) as totalInvoices,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paidInvoices,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingInvoices,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdueInvoices,
      SUM(total) as totalRevenue,
      AVG(total) as averageInvoiceValue,
      MIN(invoiceDate) as firstInvoiceDate,
      MAX(invoiceDate) as lastInvoiceDate
    FROM invoices
    WHERE 1=1
  `;
  
  const params = [];
  
  if (startDate) {
    query += ' AND DATE(invoiceDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND DATE(invoiceDate) <= ?';
    params.push(endDate);
  }
  
  if (customerId) {
    query += ' AND customerId = ?';
    params.push(customerId);
  }
  
  db.get(query, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(stats);
  });
});

// Lấy hóa đơn theo tháng
router.get('/stats/monthly', (req, res) => {
  const { year } = req.query;
  const currentYear = year || new Date().getFullYear();
  
  const query = `
    SELECT 
      strftime('%m', invoiceDate) as month,
      COUNT(*) as invoiceCount,
      SUM(total) as totalRevenue,
      AVG(total) as averageRevenue
    FROM invoices
    WHERE strftime('%Y', invoiceDate) = ?
    GROUP BY month
    ORDER BY month
  `;
  
  db.all(query, [currentYear.toString()], (err, monthlyStats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(monthlyStats);
  });
});

module.exports = router;
