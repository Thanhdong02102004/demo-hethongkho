const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả giao dịch
router.get('/', (req, res) => {
  const { type, warehouseId, startDate, endDate, limit = 100 } = req.query;
  
  let query = `
    SELECT t.*, 
           p.name as productName,
           p.sku as productSku,
           w.name as warehouseName,
           l.name as locationName,
           u.name as uomName
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    LEFT JOIN locations l ON t.locationId = l.id
    LEFT JOIN uoms u ON p.uomId = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }
  
  if (warehouseId) {
    query += ' AND t.warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (startDate) {
    query += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  query += ' ORDER BY t.transactionDate DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(transactions);
  });
});

// Lấy giao dịch theo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT t.*, 
           p.name as productName,
           p.sku as productSku,
           w.name as warehouseName,
           l.name as locationName,
           u.name as uomName
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    LEFT JOIN locations l ON t.locationId = l.id
    LEFT JOIN uoms u ON p.uomId = u.id
    WHERE t.id = ?
  `;
  
  db.get(query, [id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!transaction) {
      return res.status(404).json({ error: 'Giao dịch không tồn tại' });
    }
    res.json(transaction);
  });
});

// Tạo giao dịch mới
router.post('/', (req, res) => {
  const {
    type,
    productId,
    warehouseId,
    locationId,
    quantity,
    unitPrice,
    supplier,
    customer,
    reference,
    notes,
    transactionDate
  } = req.body;

  if (!type || !productId || !warehouseId || !quantity) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  // Kiểm tra tồn kho cho outbound
  if (type === 'outbound' || type === 'transfer') {
    db.get(
      `SELECT COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand
       FROM transactions t 
       WHERE t.productId = ? AND t.warehouseId = ?`,
      [productId, warehouseId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Lỗi kiểm tra tồn kho' });
        }
        
        if (result.onHand < quantity) {
          return res.status(400).json({ 
            error: 'Số lượng xuất vượt quá tồn kho hiện tại',
            available: result.onHand,
            requested: quantity
          });
        }
        
        // Tiếp tục tạo giao dịch
        createTransaction();
      }
    );
  } else {
    createTransaction();
  }

  function createTransaction() {
    const query = `
      INSERT INTO transactions (
        type, productId, warehouseId, locationId, quantity, unitPrice,
        supplier, customer, reference, notes, transactionDate, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date().toISOString();
    const params = [
      type, productId, warehouseId, locationId, quantity, unitPrice,
      supplier, customer, reference, notes, transactionDate || now, now
    ];

    db.run(query, params, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Lỗi tạo giao dịch' });
      }
      
      res.status(201).json({
        message: 'Tạo giao dịch thành công',
        transactionId: this.lastID
      });
    });
  }
});

// Cập nhật giao dịch
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    quantity,
    unitPrice,
    supplier,
    customer,
    reference,
    notes,
    transactionDate
  } = req.body;

  const query = `
    UPDATE transactions SET
      quantity = ?, unitPrice = ?, supplier = ?, customer = ?,
      reference = ?, notes = ?, transactionDate = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    quantity, unitPrice, supplier, customer, reference, notes, 
    transactionDate || now, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật giao dịch' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Giao dịch không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật giao dịch thành công' });
  });
});

// Xóa giao dịch
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi xóa giao dịch' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Giao dịch không tồn tại' });
    }
    
    res.json({ message: 'Xóa giao dịch thành công' });
  });
});

// Giao dịch chuyển kho
router.post('/transfer', (req, res) => {
  const {
    productId,
    fromWarehouseId,
    toWarehouseId,
    fromLocationId,
    toLocationId,
    quantity,
    unitPrice,
    reference,
    notes,
    transferDate
  } = req.body;

  if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  // Kiểm tra tồn kho tại kho nguồn
  db.get(
    `SELECT COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand
     FROM transactions t 
     WHERE t.productId = ? AND t.warehouseId = ?`,
    [productId, fromWarehouseId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi kiểm tra tồn kho' });
      }
      
      if (result.onHand < quantity) {
        return res.status(400).json({ 
          error: 'Số lượng chuyển vượt quá tồn kho hiện tại',
          available: result.onHand,
          requested: quantity
        });
      }

      // Tạo giao dịch xuất từ kho nguồn
      const outboundQuery = `
        INSERT INTO transactions (
          type, productId, warehouseId, locationId, quantity, unitPrice,
          reference, notes, transactionDate, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const now = new Date().toISOString();
      const outboundParams = [
        'outbound', productId, fromWarehouseId, fromLocationId, quantity, unitPrice,
        reference, notes, transferDate || now, now
      ];

      db.run(outboundQuery, outboundParams, function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi tạo giao dịch xuất' });
        }

        // Tạo giao dịch nhập vào kho đích
        const inboundQuery = `
          INSERT INTO transactions (
            type, productId, warehouseId, locationId, quantity, unitPrice,
            reference, notes, transactionDate, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const inboundParams = [
          'inbound', productId, toWarehouseId, toLocationId, quantity, unitPrice,
          reference, notes, transferDate || now, now
        ];

        db.run(inboundQuery, inboundParams, function(err) {
          if (err) {
            return res.status(500).json({ error: 'Lỗi tạo giao dịch nhập' });
          }
          
          res.status(201).json({
            message: 'Chuyển kho thành công',
            outboundId: this.lastID,
            inboundId: this.lastID
          });
        });
      });
    }
  );
});

// Giao dịch điều chỉnh
router.post('/adjustment', (req, res) => {
  const {
    productId,
    warehouseId,
    locationId,
    quantity,
    reason,
    notes,
    adjustmentDate
  } = req.body;

  if (!productId || !warehouseId || !quantity || !reason) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  const type = quantity > 0 ? 'inbound' : 'outbound';
  const absQuantity = Math.abs(quantity);

  const query = `
    INSERT INTO transactions (
      type, productId, warehouseId, locationId, quantity, unitPrice,
      reference, notes, transactionDate, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    type, productId, warehouseId, locationId, absQuantity, 0,
    `ADJUSTMENT: ${reason}`, notes, adjustmentDate || now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi tạo giao dịch điều chỉnh' });
    }
    
    res.status(201).json({
      message: 'Điều chỉnh kho thành công',
      transactionId: this.lastID
    });
  });
});

// Thống kê giao dịch
router.get('/stats/summary', (req, res) => {
  const { warehouseId, startDate, endDate } = req.query;
  
  let query = `
    SELECT 
      COUNT(*) as totalTransactions,
      COUNT(CASE WHEN type = 'inbound' THEN 1 END) as totalInbound,
      COUNT(CASE WHEN type = 'outbound' THEN 1 END) as totalOutbound,
      COUNT(CASE WHEN type = 'transfer' THEN 1 END) as totalTransfer,
      COUNT(CASE WHEN type = 'adjustment' THEN 1 END) as totalAdjustment,
      SUM(CASE WHEN type = 'inbound' THEN quantity ELSE 0 END) as totalInQuantity,
      SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as totalOutQuantity,
      SUM(CASE WHEN type = 'inbound' THEN quantity * unitPrice ELSE 0 END) as totalInValue,
      SUM(CASE WHEN type = 'outbound' THEN quantity * unitPrice ELSE 0 END) as totalOutValue
    FROM transactions
    WHERE 1=1
  `;
  
  const params = [];
  
  if (warehouseId) {
    query += ' AND warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (startDate) {
    query += ' AND DATE(transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND DATE(transactionDate) <= ?';
    params.push(endDate);
  }
  
  db.get(query, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(stats);
  });
});

// Giao dịch theo ngày (30 ngày gần nhất)
router.get('/stats/daily', (req, res) => {
  const { warehouseId } = req.query;
  
  let query = `
    SELECT 
      DATE(transactionDate) as date,
      COUNT(*) as totalTransactions,
      SUM(CASE WHEN type = 'inbound' THEN quantity ELSE 0 END) as inboundQuantity,
      SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as outboundQuantity,
      SUM(CASE WHEN type = 'inbound' THEN quantity * unitPrice ELSE 0 END) as inboundValue,
      SUM(CASE WHEN type = 'outbound' THEN quantity * unitPrice ELSE 0 END) as outboundValue
    FROM transactions
    WHERE transactionDate >= date('now', '-30 days')
  `;
  
  const params = [];
  
  if (warehouseId) {
    query += ' AND warehouseId = ?';
    params.push(warehouseId);
  }
  
  query += ' GROUP BY DATE(transactionDate) ORDER BY date DESC';
  
  db.all(query, params, (err, dailyStats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(dailyStats);
  });
});

module.exports = router;
