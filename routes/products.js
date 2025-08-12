const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả sản phẩm
router.get('/', (req, res) => {
  const query = `
    SELECT p.*, 
           u.name as uomName,
           w.name as warehouseName,
           l.name as locationName
    FROM products p
    LEFT JOIN uoms u ON p.uomId = u.id
    LEFT JOIN warehouses w ON p.warehouseId = w.id
    LEFT JOIN locations l ON p.locationId = l.id
    ORDER BY p.name
  `;
  
  db.all(query, [], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(products);
  });
});

// Lấy sản phẩm theo ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT p.*, 
           u.name as uomName,
           w.name as warehouseName,
           l.name as locationName
    FROM products p
    LEFT JOIN uoms u ON p.uomId = u.id
    LEFT JOIN warehouses w ON p.warehouseId = w.id
    LEFT JOIN locations l ON p.locationId = l.id
    WHERE p.id = ?
  `;
  
  db.get(query, [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    }
    res.json(product);
  });
});

// Tạo sản phẩm mới
router.post('/', (req, res) => {
  const {
    name,
    sku,
    description,
    manufacturer,
    category,
    uomId,
    warehouseId,
    locationId,
    minStock,
    maxStock,
    unitPrice,
    notes
  } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Tên và SKU là bắt buộc' });
  }

  const query = `
    INSERT INTO products (
      name, sku, description, manufacturer, category, uomId, 
      warehouseId, locationId, minStock, maxStock, unitPrice, 
      notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    name, sku, description, manufacturer, category, uomId,
    warehouseId, locationId, minStock, maxStock, unitPrice,
    notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi tạo sản phẩm' });
    }
    
    res.status(201).json({
      message: 'Tạo sản phẩm thành công',
      productId: this.lastID
    });
  });
});

// Cập nhật sản phẩm
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    sku,
    description,
    manufacturer,
    category,
    uomId,
    warehouseId,
    locationId,
    minStock,
    maxStock,
    unitPrice,
    notes
  } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Tên và SKU là bắt buộc' });
  }

  const query = `
    UPDATE products SET
      name = ?, sku = ?, description = ?, manufacturer = ?, 
      category = ?, uomId = ?, warehouseId = ?, locationId = ?,
      minStock = ?, maxStock = ?, unitPrice = ?, notes = ?, 
      updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    name, sku, description, manufacturer, category, uomId,
    warehouseId, locationId, minStock, maxStock, unitPrice,
    notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật sản phẩm' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật sản phẩm thành công' });
  });
});

// Xóa sản phẩm
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Kiểm tra xem sản phẩm có được sử dụng trong transactions không
  db.get(
    'SELECT COUNT(*) as count FROM transactions WHERE productId = ?',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi database' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: 'Không thể xóa sản phẩm đã có giao dịch' 
        });
      }

      // Xóa sản phẩm
      db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi xóa sản phẩm' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
        }
        
        res.json({ message: 'Xóa sản phẩm thành công' });
      });
    }
  );
});

// Tìm kiếm sản phẩm
router.get('/search/:keyword', (req, res) => {
  const { keyword } = req.params;
  const searchTerm = `%${keyword}%`;
  
  const query = `
    SELECT p.*, 
           u.name as uomName,
           w.name as warehouseName,
           l.name as locationName
    FROM products p
    LEFT JOIN uoms u ON p.uomId = u.id
    LEFT JOIN warehouses w ON p.warehouseId = w.id
    LEFT JOIN locations l ON p.locationId = l.id
    WHERE p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ? OR p.manufacturer LIKE ?
    ORDER BY p.name
  `;
  
  db.all(query, [searchTerm, searchTerm, searchTerm, searchTerm], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(products);
  });
});

// Lấy tồn kho theo sản phẩm
router.get('/:id/stock', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      p.id,
      p.name,
      p.sku,
      w.id as warehouseId,
      w.name as warehouseName,
      l.id as locationId,
      l.name as locationName,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalIn,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOut,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand
    FROM products p
    LEFT JOIN warehouses w ON p.warehouseId = w.id
    LEFT JOIN locations l ON p.locationId = l.id
    LEFT JOIN transactions t ON p.id = t.productId AND w.id = t.warehouseId
    WHERE p.id = ?
    GROUP BY p.id, w.id, l.id
  `;
  
  db.get(query, [id], (err, stock) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!stock) {
      return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    }
    res.json(stock);
  });
});

// Lấy tồn kho theo warehouse
router.get('/warehouse/:warehouseId/stock', (req, res) => {
  const { warehouseId } = req.params;
  
  const query = `
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.category,
      p.minStock,
      p.maxStock,
      p.unitPrice,
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
    LEFT JOIN locations l ON p.locationId = l.id
    LEFT JOIN transactions t ON p.id = t.productId AND p.warehouseId = t.warehouseId
    WHERE p.warehouseId = ?
    GROUP BY p.id, l.id
    ORDER BY p.name
  `;
  
  db.all(query, [warehouseId], (err, stockList) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(stockList);
  });
});

module.exports = router;
