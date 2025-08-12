const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Báo cáo tổng quan hệ thống
router.get('/overview', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = '';
  let dateFilterSub = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = 'WHERE DATE(t.transactionDate) BETWEEN ? AND ?';
    dateFilterSub = 'AND DATE(transactionDate) BETWEEN ? AND ?';
    params.push(startDate, endDate, startDate, endDate);
  }
  
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM warehouses) as totalWarehouses,
      (SELECT COUNT(*) FROM products) as totalProducts,
      (SELECT COUNT(*) FROM customers) as totalCustomers,
      (SELECT COUNT(*) FROM transactions ${dateFilterSub}) as totalTransactions,
      (SELECT COUNT(DISTINCT DATE(transactionDate)) FROM transactions ${dateFilterSub}) as activeDays,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalInboundValue,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalOutboundValue,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalInboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOutboundQuantity
    FROM transactions t
    ${dateFilter}
  `;
  
  db.get(query, params, (err, overview) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    overview.netInventoryValue = overview.totalInboundValue - overview.totalOutboundValue;
    overview.netInventoryQuantity = overview.totalInboundQuantity - overview.totalOutboundQuantity;
    overview.turnoverRate = overview.totalInboundQuantity > 0 ? 
      (overview.totalOutboundQuantity / overview.totalInboundQuantity * 100).toFixed(2) : 0;
    
    res.json(overview);
  });
});

// Báo cáo tồn kho theo kho
router.get('/inventory-by-warehouse', (req, res) => {
  const query = `
    SELECT 
      w.id,
      w.name as warehouseName,
      w.code as warehouseCode,
      w.totalArea,
      w.usedArea,
      COUNT(DISTINCT p.id) as totalProducts,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalInventoryValue,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalInboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOutboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHandQuantity,
      CASE 
        WHEN w.totalArea > 0 THEN (w.usedArea / w.totalArea * 100)
        ELSE 0 
      END as utilizationRate
    FROM warehouses w
    LEFT JOIN products p ON w.id = p.warehouseId
    LEFT JOIN transactions t ON p.id = t.productId AND w.id = t.warehouseId
    GROUP BY w.id
    ORDER BY w.name
  `;
  
  db.all(query, [], (err, warehouses) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    warehouses.forEach(warehouse => {
      warehouse.netInventoryValue = warehouse.totalInboundQuantity - warehouse.totalOutboundQuantity;
      warehouse.utilizationRate = warehouse.utilizationRate.toFixed(2);
      warehouse.netInventoryQuantity = warehouse.onHandQuantity;
    });
    
    res.json(warehouses);
  });
});

// Báo cáo tồn kho theo sản phẩm
router.get('/inventory-by-product', (req, res) => {
  const { category, warehouseId, stockStatus } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (category) {
    whereClause += ' AND p.category = ?';
    params.push(category);
  }
  
  if (warehouseId) {
    whereClause += ' AND p.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT 
      p.id,
      p.name as productName,
      p.sku,
      p.category,
      p.manufacturer,
      p.minStock,
      p.maxStock,
      p.unitPrice,
      w.name as warehouseName,
      l.name as locationName,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalIn,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOut,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as inventoryValue
    FROM products p
    LEFT JOIN warehouses w ON p.warehouseId = w.id
    LEFT JOIN locations l ON p.locationId = l.id
    LEFT JOIN transactions t ON p.id = t.productId AND p.warehouseId = t.warehouseId
    ${whereClause}
    GROUP BY p.id, w.id, l.id
    ORDER BY p.name
  `;
  
  db.all(query, params, (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán stock status sau khi có dữ liệu
    products.forEach(product => {
      if (product.onHand <= product.minStock) {
        product.stockStatus = 'low';
      } else if (product.onHand >= product.maxStock) {
        product.stockStatus = 'high';
      } else {
        product.stockStatus = 'normal';
      }
    });
    
    // Lọc theo stock status nếu có
    if (stockStatus) {
      products = products.filter(p => p.stockStatus === stockStatus);
    }
    
    res.json(products);
  });
});

// Báo cáo giao dịch theo thời gian
router.get('/transactions-timeline', (req, res) => {
  const { startDate, endDate, type, warehouseId } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (startDate) {
    whereClause += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  if (type) {
    whereClause += ' AND t.type = ?';
    params.push(type);
  }
  
  if (warehouseId) {
    whereClause += ' AND t.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT 
      DATE(t.transactionDate) as date,
      t.type,
      COUNT(*) as transactionCount,
      SUM(t.quantity) as totalQuantity,
      SUM(t.quantity * t.unitPrice) as totalValue,
      COUNT(DISTINCT t.productId) as uniqueProducts,
      COUNT(DISTINCT t.warehouseId) as uniqueWarehouses
    FROM transactions t
    ${whereClause}
    GROUP BY DATE(t.transactionDate), t.type
    ORDER BY date DESC, t.type
  `;
  
  db.all(query, params, (err, timeline) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(timeline);
  });
});

// Báo cáo chuyển kho
router.get('/transfer-report', (req, res) => {
  const { startDate, endDate, fromWarehouseId, toWarehouseId } = req.query;
  
  let whereClause = 'WHERE t.reference LIKE "TR-%"';
  const params = [];
  
  if (startDate) {
    whereClause += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  if (fromWarehouseId) {
    whereClause += ' AND t.warehouseId = ?';
    params.push(fromWarehouseId);
  }
  
  const query = `
    SELECT 
      t.id,
      t.reference,
      t.transactionDate,
      t.quantity,
      t.unitPrice,
      t.notes,
      p.name as productName,
      p.sku,
      w.name as warehouseName,
      l.name as locationName,
      t.type,
      CASE 
        WHEN t.type = 'outbound' THEN 'Xuất từ'
        WHEN t.type = 'inbound' THEN 'Nhập vào'
      END as transferType
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    LEFT JOIN locations l ON t.locationId = l.id
    ${whereClause}
    ORDER BY t.transactionDate DESC
  `;
  
  db.all(query, params, (err, transfers) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Nhóm theo reference để tạo báo cáo chuyển kho hoàn chỉnh
    const transferGroups = {};
    transfers.forEach(transfer => {
      if (!transferGroups[transfer.reference]) {
        transferGroups[transfer.reference] = {
          reference: transfer.reference,
          date: transfer.transactionDate,
          product: transfer.productName,
          sku: transfer.sku,
          quantity: transfer.quantity,
          unitPrice: transfer.unitPrice,
          notes: transfer.notes,
          fromWarehouse: null,
          toWarehouse: null,
          status: 'pending'
        };
      }
      
      if (transfer.type === 'outbound') {
        transferGroups[transfer.reference].fromWarehouse = transfer.warehouseName;
        transferGroups[transfer.reference].status = 'in_progress';
      } else if (transfer.type === 'inbound') {
        transferGroups[transfer.reference].toWarehouse = transfer.warehouseName;
        if (transferGroups[transfer.reference].fromWarehouse) {
          transferGroups[transfer.reference].status = 'completed';
        }
      }
    });
    
    res.json(Object.values(transferGroups));
  });
});

// Báo cáo điều chỉnh kho
router.get('/adjustment-report', (req, res) => {
  const { startDate, endDate, warehouseId, reason } = req.query;
  
  let whereClause = 'WHERE t.reference LIKE "ADJ-%"';
  const params = [];
  
  if (startDate) {
    whereClause += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  if (warehouseId) {
    whereClause += ' AND t.warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (reason) {
    whereClause += ' AND t.notes LIKE ?';
    params.push(`%${reason}%`);
  }
  
  const query = `
    SELECT 
      t.id,
      t.reference,
      t.transactionDate,
      t.quantity,
      t.notes,
      p.name as productName,
      p.sku,
      w.name as warehouseName,
      l.name as locationName,
      CASE 
        WHEN t.quantity > 0 THEN 'Tăng'
        ELSE 'Giảm'
      END as adjustmentType,
      ABS(t.quantity) as absoluteQuantity
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    LEFT JOIN locations l ON t.locationId = l.id
    ${whereClause}
    ORDER BY t.transactionDate DESC
  `;
  
  db.all(query, params, (err, adjustments) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(adjustments);
  });
});

// Báo cáo kiểm kê
router.get('/stocktake-report', (req, res) => {
  const { startDate, endDate, warehouseId } = req.query;
  
  let whereClause = 'WHERE t.reference LIKE "ST-%"';
  const params = [];
  
  if (startDate) {
    whereClause += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  if (warehouseId) {
    whereClause += ' AND t.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT 
      t.id,
      t.reference,
      t.transactionDate,
      t.quantity,
      t.notes,
      p.name as productName,
      p.sku,
      w.name as warehouseName,
      l.name as locationName
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    LEFT JOIN locations l ON t.locationId = l.id
    ${whereClause}
    ORDER BY t.transactionDate DESC
  `;
  
  db.all(query, params, (err, stocktakes) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(stocktakes);
  });
});

// Báo cáo doanh thu theo thời gian
router.get('/revenue-timeline', (req, res) => {
  const { startDate, endDate, warehouseId, groupBy = 'day' } = req.query;
  
  let dateFormat = 'DATE(t.transactionDate)';
  if (groupBy === 'month') {
    dateFormat = 'strftime("%Y-%m", t.transactionDate)';
  } else if (groupBy === 'week') {
    dateFormat = 'strftime("%Y-W%W", t.transactionDate)';
  }
  
  let whereClause = 'WHERE t.type = "outbound"';
  const params = [];
  
  if (startDate) {
    whereClause += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  if (warehouseId) {
    whereClause += ' AND t.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT 
      ${dateFormat} as period,
      COUNT(*) as transactionCount,
      SUM(t.quantity) as totalQuantity,
      SUM(t.quantity * t.unitPrice) as totalRevenue,
      COUNT(DISTINCT t.productId) as uniqueProducts,
      AVG(t.quantity * t.unitPrice) as averageOrderValue
    FROM transactions t
    ${whereClause}
    GROUP BY ${dateFormat}
    ORDER BY period DESC
  `;
  
  db.all(query, params, (err, revenue) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(revenue);
  });
});

// Báo cáo top sản phẩm
router.get('/top-products', (req, res) => {
  const { startDate, endDate, warehouseId, limit = 10, sortBy = 'revenue' } = req.query;
  
  let whereClause = 'WHERE t.type = "outbound"';
  const params = [];
  
  if (startDate) {
    whereClause += ' AND DATE(t.transactionDate) >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    whereClause += ' AND DATE(t.transactionDate) <= ?';
    params.push(endDate);
  }
  
  if (warehouseId) {
    whereClause += ' AND t.warehouseId = ?';
    params.push(warehouseId);
  }
  
  let orderBy = 'totalRevenue DESC';
  if (sortBy === 'quantity') {
    orderBy = 'totalQuantity DESC';
  } else if (sortBy === 'transactions') {
    orderBy = 'transactionCount DESC';
  }
  
  const query = `
    SELECT 
      p.id,
      p.name as productName,
      p.sku,
      p.category,
      p.manufacturer,
      w.name as warehouseName,
      COUNT(*) as transactionCount,
      SUM(t.quantity) as totalQuantity,
      SUM(t.quantity * t.unitPrice) as totalRevenue,
      AVG(t.unitPrice) as averagePrice
    FROM transactions t
    LEFT JOIN products p ON t.productId = p.id
    LEFT JOIN warehouses w ON t.warehouseId = w.id
    ${whereClause}
    GROUP BY p.id, w.id
    ORDER BY ${orderBy}
    LIMIT ?
  `;
  
  params.push(parseInt(limit));
  
  db.all(query, params, (err, topProducts) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(topProducts);
  });
});

// Báo cáo hiệu suất kho
router.get('/warehouse-performance', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = 'AND DATE(t.transactionDate) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  const query = `
    SELECT 
      w.id,
      w.name as warehouseName,
      w.code as warehouseCode,
      w.totalArea,
      w.usedArea,
      COUNT(DISTINCT p.id) as totalProducts,
      COUNT(DISTINCT l.id) as totalLocations,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN 1 ELSE 0 END), 0) as inboundTransactions,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN 1 ELSE 0 END), 0) as outboundTransactions,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' THEN 1 ELSE 0 END), 0) as transferTransactions,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as totalInboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as totalOutboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalInboundValue,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as totalOutboundValue
    FROM warehouses w
    LEFT JOIN products p ON w.id = p.warehouseId
    LEFT JOIN locations l ON w.id = l.warehouseId
    LEFT JOIN transactions t ON w.id = t.warehouseId ${dateFilter}
    GROUP BY w.id
    ORDER BY w.name
  `;
  
  db.all(query, params, (err, performance) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    performance.forEach(warehouse => {
      warehouse.utilizationRate = warehouse.totalArea > 0 ? 
        (warehouse.usedArea / warehouse.totalArea * 100).toFixed(2) : 0;
      warehouse.totalTransactions = warehouse.inboundTransactions + warehouse.outboundTransactions + warehouse.transferTransactions;
      warehouse.netInventoryValue = warehouse.totalInboundValue - warehouse.totalOutboundValue;
      warehouse.turnoverRate = warehouse.totalInboundQuantity > 0 ? 
        (warehouse.totalOutboundQuantity / warehouse.totalInboundQuantity * 100).toFixed(2) : 0;
      warehouse.netInventoryQuantity = warehouse.totalInboundQuantity - warehouse.totalOutboundQuantity;
    });
    
    res.json(performance);
  });
});

// Báo cáo xu hướng
router.get('/trends', (req, res) => {
  const { period = '30', metric = 'revenue' } = req.query;
  
  let selectField = 'SUM(t.quantity * t.unitPrice)';
  if (metric === 'quantity') {
    selectField = 'SUM(t.quantity)';
  } else if (metric === 'transactions') {
    selectField = 'COUNT(*)';
  }
  
  const query = `
    SELECT 
      DATE(t.transactionDate) as date,
      ${selectField} as value,
      COUNT(*) as transactionCount,
      COUNT(DISTINCT t.productId) as uniqueProducts
    FROM transactions t
    WHERE t.transactionDate >= date('now', '-${period} days')
    GROUP BY DATE(t.transactionDate)
    ORDER BY date ASC
  `;
  
  db.all(query, [], (err, trends) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thay đổi so với ngày trước
    trends.forEach((trend, index) => {
      if (index > 0) {
        const previousValue = trends[index - 1].value || 0;
        const currentValue = trend.value || 0;
        trend.change = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100).toFixed(2) : 0;
        trend.changeType = trend.change > 0 ? 'increase' : trend.change < 0 ? 'decrease' : 'stable';
      } else {
        trend.change = 0;
        trend.changeType = 'stable';
      }
    });
    
    res.json(trends);
  });
});

// Báo cáo tồn kho thấp
router.get('/low-stock-alert', (req, res) => {
  const { warehouseId, limit = 20 } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (warehouseId) {
    whereClause += ' AND p.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT 
      p.id,
      p.name as productName,
      p.sku,
      p.category,
      p.manufacturer,
      p.minStock,
      p.maxStock,
      p.unitPrice,
      w.name as warehouseName,
      l.name as locationName,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as onHand,
      CASE 
        WHEN COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) <= p.minStock THEN 'critical'
        WHEN COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) <= p.minStock * 1.5 THEN 'warning'
        ELSE 'normal'
      END as alertLevel
    FROM products p
    LEFT JOIN warehouses w ON p.warehouseId = w.id
    LEFT JOIN locations l ON p.locationId = l.id
    LEFT JOIN transactions t ON p.id = t.productId AND p.warehouseId = t.warehouseId
    ${whereClause}
    GROUP BY p.id, w.id, l.id
    HAVING onHand <= p.minStock * 1.5
    ORDER BY onHand ASC
    LIMIT ?
  `;
  
  params.push(parseInt(limit));
  
  db.all(query, params, (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    alerts.forEach(alert => {
      alert.shortage = alert.minStock - alert.onHand;
      alert.shortageValue = alert.shortage * alert.unitPrice;
    });
    
    res.json(alerts);
  });
});

// Báo cáo chi phí lưu kho
router.get('/storage-cost', (req, res) => {
  const { warehouseId, startDate, endDate } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (warehouseId) {
    whereClause += ' AND w.id = ?';
    params.push(warehouseId);
  }
  
  if (startDate && endDate) {
    whereClause += ' AND DATE(t.transactionDate) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  const query = `
    SELECT 
      w.id,
      w.name as warehouseName,
      w.code as warehouseCode,
      w.totalArea,
      w.usedArea,
      w.rentalPrice,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as inventoryValue,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE -t.quantity END), 0) as totalQuantity,
      CASE 
        WHEN w.totalArea > 0 THEN (w.usedArea / w.totalArea * 100)
        ELSE 0 
      END as utilizationRate
    FROM warehouses w
    LEFT JOIN products p ON w.id = p.warehouseId
    LEFT JOIN transactions t ON p.id = t.productId AND w.id = t.warehouseId
    ${whereClause}
    GROUP BY w.id
    ORDER BY w.name
  `;
  
  db.all(query, params, (err, costs) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán chi phí
    costs.forEach(cost => {
      cost.utilizationRate = cost.utilizationRate.toFixed(2);
      cost.monthlyRent = cost.totalArea * (cost.rentalPrice || 0);
      cost.inventoryCost = cost.inventoryValue * 0.02; // Giả sử 2% giá trị tồn kho/tháng
      cost.totalMonthlyCost = cost.monthlyRent + cost.inventoryCost;
      cost.costPerSqm = cost.totalArea > 0 ? (cost.totalMonthlyCost / cost.totalArea).toFixed(2) : 0;
    });
    
    res.json(costs);
  });
});

// Báo cáo hiệu quả kho
router.get('/warehouse-efficiency', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = 'AND DATE(t.transactionDate) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  const query = `
    SELECT 
      w.id,
      w.name as warehouseName,
      w.code as warehouseCode,
      w.totalArea,
      w.usedArea,
      COUNT(DISTINCT p.id) as totalProducts,
      COUNT(DISTINCT l.id) as totalLocations,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN 1 ELSE 0 END), 0) as inboundCount,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN 1 ELSE 0 END), 0) as outboundCount,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity ELSE 0 END), 0) as inboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity ELSE 0 END), 0) as outboundQuantity,
      COALESCE(SUM(CASE WHEN t.type = 'inbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as inboundValue,
      COALESCE(SUM(CASE WHEN t.type = 'outbound' THEN t.quantity * t.unitPrice ELSE 0 END), 0) as outboundValue
    FROM warehouses w
    LEFT JOIN products p ON w.id = p.warehouseId
    LEFT JOIN locations l ON w.id = l.warehouseId
    LEFT JOIN transactions t ON w.id = t.warehouseId ${dateFilter}
    GROUP BY w.id
    ORDER BY w.name
  `;
  
  db.all(query, params, (err, efficiency) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán hiệu quả
    efficiency.forEach(warehouse => {
      warehouse.utilizationRate = warehouse.totalArea > 0 ? 
        (warehouse.usedArea / warehouse.totalArea * 100).toFixed(2) : 0;
      warehouse.totalTransactions = warehouse.inboundCount + warehouse.outboundCount;
      warehouse.turnoverRate = warehouse.inboundQuantity > 0 ? 
        (warehouse.outboundQuantity / warehouse.inboundQuantity * 100).toFixed(2) : 0;
      warehouse.valueEfficiency = warehouse.totalArea > 0 ? 
        (warehouse.inboundValue / warehouse.totalArea).toFixed(2) : 0;
      warehouse.productDensity = warehouse.totalArea > 0 ? 
        (warehouse.totalProducts / warehouse.totalArea).toFixed(2) : 0;
    });
    
    res.json(efficiency);
  });
});

module.exports = router;
