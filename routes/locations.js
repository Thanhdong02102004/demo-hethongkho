const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả vị trí
router.get('/', (req, res) => {
  const { warehouseId, type, status } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (warehouseId) {
    whereClause += ' AND l.warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (type) {
    whereClause += ' AND l.type = ?';
    params.push(type);
  }
  
  if (status) {
    whereClause += ' AND l.status = ?';
    params.push(status);
  }
  
  const query = `
    SELECT l.*, 
           w.name as warehouseName,
           w.code as warehouseCode,
           COUNT(p.id) as productCount,
           COALESCE(SUM(p.unitPrice * COALESCE(
             (SELECT SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END)
              FROM transactions t WHERE t.productId = p.id AND t.warehouseId = l.warehouseId), 0
           )), 0) as inventoryValue
    FROM locations l
    LEFT JOIN warehouses w ON l.warehouseId = w.id
    LEFT JOIN products p ON l.id = p.locationId
    ${whereClause}
    GROUP BY l.id, w.id
    ORDER BY w.name, l.code
  `;
  
  db.all(query, params, (err, locations) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(locations);
  });
});

// Lấy vị trí theo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT l.*, 
           w.name as warehouseName,
           w.code as warehouseCode,
           COUNT(p.id) as productCount
    FROM locations l
    LEFT JOIN warehouses w ON l.warehouseId = w.id
    LEFT JOIN products p ON l.id = p.locationId
    WHERE l.id = ?
    GROUP BY l.id, w.id
  `;
  
  db.get(query, [id], (err, location) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!location) {
      return res.status(404).json({ error: 'Vị trí không tồn tại' });
    }
    res.json(location);
  });
});

// Tạo vị trí mới
router.post('/', (req, res) => {
  const {
    warehouseId,
    code,
    name,
    type,
    area,
    capacity,
    notes
  } = req.body;

  if (!warehouseId || !code || !name) {
    return res.status(400).json({ error: 'Warehouse ID, mã và tên vị trí là bắt buộc' });
  }

  const query = `
    INSERT INTO locations (
      warehouseId, code, name, type, area, capacity, status, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    warehouseId, code, name, type || 'storage', area, capacity, 'available', notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã vị trí đã tồn tại trong kho này' });
      }
      return res.status(500).json({ error: 'Lỗi tạo vị trí' });
    }
    
    res.status(201).json({
      message: 'Tạo vị trí thành công',
      locationId: this.lastID
    });
  });
});

// Cập nhật vị trí
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    code,
    name,
    type,
    area,
    capacity,
    status,
    notes
  } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: 'Mã và tên vị trí là bắt buộc' });
  }

  const query = `
    UPDATE locations SET
      code = ?, name = ?, type = ?, area = ?, capacity = ?,
      status = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    code, name, type || 'storage', area, capacity, status || 'available', notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã vị trí đã tồn tại trong kho này' });
      }
      return res.status(500).json({ error: 'Lỗi cập nhật vị trí' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Vị trí không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật vị trí thành công' });
  });
});

// Xóa vị trí
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Kiểm tra xem vị trí có sản phẩm không
  db.get(
    'SELECT COUNT(*) as count FROM products WHERE locationId = ?',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi kiểm tra vị trí' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Không thể xóa vị trí đã có sản phẩm',
          productCount: result.count
        });
      }

      // Xóa vị trí
      db.run('DELETE FROM locations WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi xóa vị trí' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Vị trí không tồn tại' });
        }
        
        res.json({ message: 'Xóa vị trí thành công' });
      });
    }
  );
});

// Lấy sản phẩm trong vị trí
router.get('/:id/products', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT p.*, 
           u.name as uomName,
           COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalIn,
           COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOut,
           COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand
    FROM products p
    LEFT JOIN uoms u ON p.uomId = u.id
    LEFT JOIN transactions t ON p.id = t.productId AND p.warehouseId = t.warehouseId
    WHERE p.locationId = ?
    GROUP BY p.id, u.id
    ORDER BY p.name
  `;
  
  db.all(query, [id], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(products);
  });
});

// Cập nhật trạng thái vị trí
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['available', 'occupied', 'full', 'maintenance'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  }

  db.run(
    'UPDATE locations SET status = ?, updatedAt = ? WHERE id = ?',
    [status, new Date().toISOString(), id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Lỗi cập nhật trạng thái' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vị trí không tồn tại' });
      }
      
      res.json({ message: 'Cập nhật trạng thái thành công' });
    }
  );
});

// Lấy bản đồ kho
router.get('/warehouse/:warehouseId/map', (req, res) => {
  const { warehouseId } = req.params;
  
  const query = `
    SELECT 
      l.id,
      l.code,
      l.name,
      l.type,
      l.area,
      l.capacity,
      l.status,
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
  
  db.all(query, [warehouseId], (err, locations) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    locations.forEach(location => {
      location.utilizationRate = location.capacity > 0 ? 
        (location.productCount / location.capacity * 100).toFixed(2) : 0;
      location.availableCapacity = location.capacity - location.productCount;
    });
    
    res.json(locations);
  });
});

// Tìm kiếm vị trí trống
router.get('/available', (req, res) => {
  const { warehouseId, type, minArea } = req.query;
  
  let whereClause = 'WHERE l.status = "available"';
  const params = [];
  
  if (warehouseId) {
    whereClause += ' AND l.warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (type) {
    whereClause += ' AND l.type = ?';
    params.push(type);
  }
  
  if (minArea) {
    whereClause += ' AND l.area >= ?';
    params.push(parseFloat(minArea));
  }
  
  const query = `
    SELECT l.*, 
           w.name as warehouseName,
           w.code as warehouseCode,
           COUNT(p.id) as productCount,
           (l.capacity - COUNT(p.id)) as availableCapacity
    FROM locations l
    LEFT JOIN warehouses w ON l.warehouseId = w.id
    LEFT JOIN products p ON l.id = p.locationId
    ${whereClause}
    GROUP BY l.id, w.id
    HAVING availableCapacity > 0
    ORDER BY availableCapacity DESC
  `;
  
  db.all(query, params, (err, availableLocations) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(availableLocations);
  });
});

// Thống kê vị trí theo kho
router.get('/stats/by-warehouse', (req, res) => {
  const query = `
    SELECT 
      w.id,
      w.name as warehouseName,
      w.code as warehouseCode,
      COUNT(l.id) as totalLocations,
      COUNT(CASE WHEN l.status = 'available' THEN 1 END) as availableLocations,
      COUNT(CASE WHEN l.status = 'occupied' THEN 1 END) as occupiedLocations,
      COUNT(CASE WHEN l.status = 'full' THEN 1 END) as fullLocations,
      COUNT(CASE WHEN l.status = 'maintenance' THEN 1 END) as maintenanceLocations,
      SUM(l.area) as totalArea,
      SUM(l.capacity) as totalCapacity,
      COUNT(DISTINCT p.id) as totalProducts
    FROM warehouses w
    LEFT JOIN locations l ON w.id = l.warehouseId
    LEFT JOIN products p ON l.id = p.locationId
    GROUP BY w.id
    ORDER BY w.name
  `;
  
  db.all(query, [], (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    stats.forEach(warehouse => {
      warehouse.utilizationRate = warehouse.totalCapacity > 0 ? 
        (warehouse.totalProducts / warehouse.totalCapacity * 100).toFixed(2) : 0;
      warehouse.availableCapacity = warehouse.totalCapacity - warehouse.totalProducts;
    });
    
    res.json(stats);
  });
});

// Lấy vị trí theo loại
router.get('/by-type/:type', (req, res) => {
  const { type } = req.params;
  const { warehouseId } = req.query;
  
  let whereClause = 'WHERE l.type = ?';
  const params = [type];
  
  if (warehouseId) {
    whereClause += ' AND l.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT l.*, 
           w.name as warehouseName,
           w.code as warehouseCode,
           COUNT(p.id) as productCount
    FROM locations l
    LEFT JOIN warehouses w ON l.warehouseId = w.id
    LEFT JOIN products p ON l.id = p.locationId
    ${whereClause}
    GROUP BY l.id, w.id
    ORDER BY w.name, l.code
  `;
  
  db.all(query, params, (err, locations) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(locations);
  });
});

module.exports = router;
