const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả kho
router.get('/', (req, res) => {
  const query = `
    SELECT w.*, 
           COUNT(DISTINCT l.id) as totalLocations,
           COUNT(DISTINCT p.id) as totalProducts,
           COALESCE(SUM(p.unitPrice * COALESCE(
             (SELECT SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END)
              FROM transactions t WHERE t.productId = p.id AND t.warehouseId = w.id), 0
           )), 0) as totalInventoryValue
    FROM warehouses w
    LEFT JOIN locations l ON w.id = l.warehouseId
    LEFT JOIN products p ON w.id = p.warehouseId
    GROUP BY w.id
    ORDER BY w.name
  `;
  
  db.all(query, [], (err, warehouses) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(warehouses);
  });
});

// Lấy kho theo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT w.*, 
           COUNT(DISTINCT l.id) as totalLocations,
           COUNT(DISTINCT p.id) as totalProducts
    FROM warehouses w
    LEFT JOIN locations l ON w.id = l.warehouseId
    LEFT JOIN products p ON w.id = p.warehouseId
    WHERE w.id = ?
    GROUP BY w.id
  `;
  
  db.get(query, [id], (err, warehouse) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!warehouse) {
      return res.status(404).json({ error: 'Kho không tồn tại' });
    }
    res.json(warehouse);
  });
});

// Tạo kho mới
router.post('/', (req, res) => {
  const {
    name,
    code,
    address,
    city,
    country,
    phone,
    email,
    manager,
    totalArea,
    type,
    rentalPrice,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Tên và mã kho là bắt buộc' });
  }

  const query = `
    INSERT INTO warehouses (
      name, code, address, city, country, phone, email, manager,
      totalArea, type, rentalPrice, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    name, code, address, city, country || 'Vietnam', phone, email, manager,
    totalArea, type || 'general', rentalPrice || 0, notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã kho đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi tạo kho' });
    }
    
    res.status(201).json({
      message: 'Tạo kho thành công',
      warehouseId: this.lastID
    });
  });
});

// Cập nhật kho
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    code,
    address,
    city,
    country,
    phone,
    email,
    manager,
    totalArea,
    type,
    rentalPrice,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Tên và mã kho là bắt buộc' });
  }

  const query = `
    UPDATE warehouses SET
      name = ?, code = ?, address = ?, city = ?, country = ?,
      phone = ?, email = ?, manager = ?, totalArea = ?, type = ?,
      rentalPrice = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    name, code, address, city, country || 'Vietnam', phone, email, manager,
    totalArea, type || 'general', rentalPrice || 0, notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã kho đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi cập nhật kho' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Kho không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật kho thành công' });
  });
});

// Xóa kho
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Kiểm tra xem kho có sản phẩm hoặc giao dịch không
  db.get(
    `SELECT 
       (SELECT COUNT(*) FROM products WHERE warehouseId = ?) as productCount,
       (SELECT COUNT(*) FROM transactions WHERE warehouseId = ?) as transactionCount
     FROM warehouses WHERE id = ?`,
    [id, id, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi kiểm tra kho' });
      }
      
      if (result.productCount > 0 || result.transactionCount > 0) {
        return res.status(400).json({ 
          error: 'Không thể xóa kho đã có sản phẩm hoặc giao dịch',
          productCount: result.productCount,
          transactionCount: result.transactionCount
        });
      }

      // Xóa kho
      db.run('DELETE FROM warehouses WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi xóa kho' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Kho không tồn tại' });
        }
        
        res.json({ message: 'Xóa kho thành công' });
      });
    }
  );
});

// Lấy thống kê kho
router.get('/:id/stats', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      w.name as warehouseName,
      w.totalArea,
      w.usedArea,
      COUNT(DISTINCT l.id) as totalLocations,
      COUNT(DISTINCT p.id) as totalProducts,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalInbound,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOutbound,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalInboundValue,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalOutboundValue
    FROM warehouses w
    LEFT JOIN locations l ON w.id = l.warehouseId
    LEFT JOIN products p ON w.id = p.warehouseId
    LEFT JOIN transactions t ON w.id = t.warehouseId
    WHERE w.id = ?
    GROUP BY w.id
  `;
  
  db.get(query, [id], (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!stats) {
      return res.status(404).json({ error: 'Kho không tồn tại' });
    }
    
    // Tính toán thêm
    stats.utilizationRate = stats.totalArea > 0 ? (stats.usedArea / stats.totalArea * 100).toFixed(2) : 0;
    stats.netInventory = stats.totalInbound - stats.totalOutbound;
    stats.netValue = stats.totalInboundValue - stats.totalOutboundValue;
    
    res.json(stats);
  });
});

// Lấy vị trí trong kho
router.get('/:id/locations', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT l.*, 
           COUNT(p.id) as productCount,
           COALESCE(SUM(p.unitPrice * COALESCE(
             (SELECT SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END)
              FROM transactions t WHERE t.productId = p.id AND t.warehouseId = l.warehouseId), 0
           )), 0) as inventoryValue
    FROM locations l
    LEFT JOIN products p ON l.id = p.locationId
    WHERE l.warehouseId = ?
    GROUP BY l.id
    ORDER BY l.code
  `;
  
  db.all(query, [id], (err, locations) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(locations);
  });
});

// Lấy sản phẩm trong kho
router.get('/:id/products', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT p.*, 
           u.name as uomName,
           l.name as locationName,
           COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalIn,
           COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOut,
           COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand,
           CASE 
             WHEN COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) <= p.minStock THEN 'low'
             WHEN COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) >= p.maxStock THEN 'high'
             ELSE 'normal'
           END as stockStatus
    FROM products p
    LEFT JOIN uoms u ON p.uomId = u.id
    LEFT JOIN locations l ON p.locationId = l.id
    LEFT JOIN transactions t ON p.id = t.productId AND p.warehouseId = t.warehouseId
    WHERE p.warehouseId = ?
    GROUP BY p.id, u.id, l.id
    ORDER BY p.name
  `;
  
  db.all(query, [id], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(products);
  });
});

// Cập nhật diện tích sử dụng
router.put('/:id/area-usage', (req, res) => {
  const { id } = req.params;
  const { usedArea } = req.body;

  if (usedArea === undefined || usedArea < 0) {
    return res.status(400).json({ error: 'Diện tích sử dụng không hợp lệ' });
  }

  db.run(
    'UPDATE warehouses SET usedArea = ?, updatedAt = ? WHERE id = ?',
    [usedArea, new Date().toISOString(), id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Lỗi cập nhật diện tích' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Kho không tồn tại' });
      }
      
      res.json({ message: 'Cập nhật diện tích thành công' });
    }
  );
});

// Lấy báo cáo sử dụng kho
router.get('/:id/usage-report', (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  
  let query = `
    SELECT 
      DATE(t.transactionDate) as date,
      t.type,
      COUNT(*) as transactionCount,
      SUM(t.quantity) as totalQuantity,
      SUM(t.quantity * t.unitPrice) as totalValue,
      COUNT(DISTINCT t.productId) as uniqueProducts
    FROM transactions t
    WHERE t.warehouseId = ?
  `;
  
  const params = [id];
  
  if (startDate) {
    query += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY DATE(t.transactionDate), t.type ORDER BY date DESC, t.type';
  
  db.all(query, params, (err, report) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(report);
  });
});

module.exports = router;
