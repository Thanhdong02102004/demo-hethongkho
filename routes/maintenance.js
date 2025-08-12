const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();

// Lấy tất cả kế hoạch bảo trì
router.get('/plans', (req, res) => {
  const { warehouseId, type, status, priority } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (warehouseId) {
    whereClause += ' AND mp.warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (type) {
    whereClause += ' AND mp.type = ?';
    params.push(type);
  }
  
  if (status) {
    whereClause += ' AND mp.status = ?';
    params.push(status);
  }
  
  if (priority) {
    whereClause += ' AND mp.priority = ?';
    params.push(priority);
  }
  
  const query = `
    SELECT mp.*, 
           w.name as warehouseName,
           w.code as warehouseCode,
           mp.estimatedCost as plannedCost,
           COALESCE(mp.estimatedCost, 0) as totalPlannedCost
    FROM maintenance_plans mp
    LEFT JOIN warehouses w ON mp.warehouseId = w.id
    ${whereClause}
    ORDER BY mp.plannedDate ASC
  `;
  
  db.all(query, params, (err, plans) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(plans);
  });
});

// Lấy kế hoạch bảo trì theo ID
router.get('/plans/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT mp.*, 
           w.name as warehouseName,
           w.code as warehouseCode
    FROM maintenance_plans mp
    LEFT JOIN warehouses w ON mp.warehouseId = w.id
    WHERE mp.id = ?
  `;
  
  db.get(query, [id], (err, plan) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!plan) {
      return res.status(404).json({ error: 'Kế hoạch bảo trì không tồn tại' });
    }
    res.json(plan);
  });
});

// Tạo kế hoạch bảo trì mới
router.post('/plans', (req, res) => {
  const {
    warehouseId,
    title,
    description,
    type,
    priority,
    plannedDate,
    estimatedDuration,
    estimatedCost,
    responsibleStaff,
    notes
  } = req.body;

  if (!warehouseId || !title || !plannedDate) {
    return res.status(400).json({ error: 'Warehouse ID, tiêu đề và ngày kế hoạch là bắt buộc' });
  }

  const query = `
    INSERT INTO maintenance_plans (
      warehouseId, title, description, type, priority, plannedDate,
      estimatedDuration, estimatedCost, responsibleStaff, status, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    warehouseId, title, description, type || 'preventive', priority || 'medium',
    plannedDate, estimatedDuration || 1, estimatedCost || 0, responsibleStaff,
    'planned', notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi tạo kế hoạch bảo trì' });
    }
    
    res.status(201).json({
      message: 'Tạo kế hoạch bảo trì thành công',
      planId: this.lastID
    });
  });
});

// Cập nhật kế hoạch bảo trì
router.put('/plans/:id', (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    type,
    priority,
    plannedDate,
    estimatedDuration,
    estimatedCost,
    responsibleStaff,
    status,
    notes
  } = req.body;

  if (!title || !plannedDate) {
    return res.status(400).json({ error: 'Tiêu đề và ngày kế hoạch là bắt buộc' });
  }

  const query = `
    UPDATE maintenance_plans SET
      title = ?, description = ?, type = ?, priority = ?, plannedDate = ?,
      estimatedDuration = ?, estimatedCost = ?, responsibleStaff = ?, status = ?,
      notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    title, description, type || 'preventive', priority || 'medium', plannedDate,
    estimatedDuration || 1, estimatedCost || 0, responsibleStaff, status || 'planned',
    notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật kế hoạch bảo trì' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Kế hoạch bảo trì không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật kế hoạch bảo trì thành công' });
  });
});

// Xóa kế hoạch bảo trì
router.delete('/plans/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM maintenance_plans WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi xóa kế hoạch bảo trì' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Kế hoạch bảo trì không tồn tại' });
    }
    
    res.json({ message: 'Xóa kế hoạch bảo trì thành công' });
  });
});

// Cập nhật tiến độ bảo trì
router.post('/plans/:id/progress', (req, res) => {
  const { id } = req.params;
  const {
    status,
    progressPercent,
    actualStartDate,
    actualEndDate,
    actualCost,
    notes,
    updatedBy
  } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Trạng thái là bắt buộc' });
  }

  const query = `
    INSERT INTO maintenance_progress (
      planId, status, progressPercent, actualStartDate, actualEndDate,
      actualCost, notes, updatedBy, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    id, status, progressPercent || 0, actualStartDate, actualEndDate,
    actualCost || 0, notes, updatedBy, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật tiến độ' });
    }
    
    // Cập nhật trạng thái kế hoạch
    db.run(
      'UPDATE maintenance_plans SET status = ?, updatedAt = ? WHERE id = ?',
      [status, now, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Lỗi cập nhật trạng thái kế hoạch' });
        }
        
        res.status(201).json({
          message: 'Cập nhật tiến độ thành công',
          progressId: this.lastID
        });
      }
    );
  });
});

// Lấy tiến độ bảo trì
router.get('/plans/:id/progress', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT * FROM maintenance_progress
    WHERE planId = ?
    ORDER BY updatedAt DESC
  `;
  
  db.all(query, [id], (err, progress) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(progress);
  });
});

// Lấy tất cả sự cố
router.get('/incidents', (req, res) => {
  const { warehouseId, type, severity, status } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (warehouseId) {
    whereClause += ' AND i.warehouseId = ?';
    params.push(warehouseId);
  }
  
  if (type) {
    whereClause += ' AND i.type = ?';
    params.push(type);
  }
  
  if (severity) {
    whereClause += ' AND i.severity = ?';
    params.push(severity);
  }
  
  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }
  
  const query = `
    SELECT i.*, 
           w.name as warehouseName,
           w.code as warehouseCode
    FROM incidents i
    LEFT JOIN warehouses w ON i.warehouseId = w.id
    ${whereClause}
    ORDER BY i.reportedAt DESC
  `;
  
  db.all(query, params, (err, incidents) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(incidents);
  });
});

// Lấy sự cố theo ID
router.get('/incidents/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT i.*, 
           w.name as warehouseName,
           w.code as warehouseCode
    FROM incidents i
    LEFT JOIN warehouses w ON i.warehouseId = w.id
    WHERE i.id = ?
  `;
  
  db.get(query, [id], (err, incident) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!incident) {
      return res.status(404).json({ error: 'Sự cố không tồn tại' });
    }
    res.json(incident);
  });
});

// Tạo báo cáo sự cố mới
router.post('/incidents', (req, res) => {
  const {
    warehouseId,
    title,
    description,
    type,
    severity,
    reporter,
    phone,
    notes
  } = req.body;

  if (!warehouseId || !title || !description) {
    return res.status(400).json({ error: 'Warehouse ID, tiêu đề và mô tả là bắt buộc' });
  }

  const query = `
    INSERT INTO incidents (
      warehouseId, title, description, type, severity, reporter, phone, status, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    warehouseId, title, description, type || 'equipment', severity || 'medium',
    reporter, phone, 'reported', notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi tạo báo cáo sự cố' });
    }
    
    res.status(201).json({
      message: 'Tạo báo cáo sự cố thành công',
      incidentId: this.lastID
    });
  });
});

// Cập nhật sự cố
router.put('/incidents/:id', (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    type,
    severity,
    status,
    action,
    resolvedAt,
    resolvedBy,
    notes
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Tiêu đề và mô tả là bắt buộc' });
  }

  const query = `
    UPDATE incidents SET
      title = ?, description = ?, type = ?, severity = ?, status = ?,
      action = ?, resolvedAt = ?, resolvedBy = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    title, description, type || 'equipment', severity || 'medium', status || 'reported',
    action, resolvedAt, resolvedBy, notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật sự cố' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sự cố không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật sự cố thành công' });
  });
});

// Xóa sự cố
router.delete('/incidents/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM incidents WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi xóa sự cố' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sự cố không tồn tại' });
    }
    
    res.json({ message: 'Xóa sự cố thành công' });
  });
});

// Lấy tất cả nhân viên bảo trì
router.get('/staff', (req, res) => {
  const { status, specialty } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (status) {
    whereClause += ' AND ms.status = ?';
    params.push(status);
  }
  
  if (specialty) {
    whereClause += ' AND ms.specialty LIKE ?';
    params.push(`%${specialty}%`);
  }
  
  const query = `
    SELECT ms.*, 
           COUNT(mp.id) as assignedPlans,
           COUNT(i.id) as assignedIncidents
    FROM maintenance_staff ms
    LEFT JOIN maintenance_plans mp ON ms.name = mp.responsibleStaff
    LEFT JOIN incidents i ON ms.name = i.resolvedBy
    ${whereClause}
    GROUP BY ms.id
    ORDER BY ms.name
  `;
  
  db.all(query, params, (err, staff) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    res.json(staff);
  });
});

// Lấy nhân viên bảo trì theo ID
router.get('/staff/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT ms.*, 
           COUNT(mp.id) as assignedPlans,
           COUNT(i.id) as assignedIncidents
    FROM maintenance_staff ms
    LEFT JOIN maintenance_plans mp ON ms.name = mp.responsibleStaff
    LEFT JOIN incidents i ON ms.name = i.resolvedBy
    WHERE ms.id = ?
    GROUP BY ms.id
  `;
  
  db.get(query, [id], (err, staff) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    if (!staff) {
      return res.status(404).json({ error: 'Nhân viên bảo trì không tồn tại' });
    }
    res.json(staff);
  });
});

// Tạo nhân viên bảo trì mới
router.post('/staff', (req, res) => {
  const {
    name,
    code,
    position,
    specialty,
    phone,
    email,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Tên và mã nhân viên là bắt buộc' });
  }

  const query = `
    INSERT INTO maintenance_staff (
      name, code, position, specialty, phone, email, status, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const now = new Date().toISOString();
  const params = [
    name, code, position, specialty, phone, email, 'active', notes, now, now
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã nhân viên đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi tạo nhân viên bảo trì' });
    }
    
    res.status(201).json({
      message: 'Tạo nhân viên bảo trì thành công',
      staffId: this.lastID
    });
  });
});

// Cập nhật nhân viên bảo trì
router.put('/staff/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    code,
    position,
    specialty,
    phone,
    email,
    status,
    notes
  } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Tên và mã nhân viên là bắt buộc' });
  }

  const query = `
    UPDATE maintenance_staff SET
      name = ?, code = ?, position = ?, specialty = ?, phone = ?,
      email = ?, status = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `;

  const now = new Date().toISOString();
  const params = [
    name, code, position, specialty, phone, email, status || 'active', notes, now, id
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mã nhân viên đã tồn tại' });
      }
      return res.status(500).json({ error: 'Lỗi cập nhật nhân viên bảo trì' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nhân viên bảo trì không tồn tại' });
    }
    
    res.json({ message: 'Cập nhật nhân viên bảo trì thành công' });
  });
});

// Xóa nhân viên bảo trì
router.delete('/staff/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM maintenance_staff WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Lỗi xóa nhân viên bảo trì' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Nhân viên bảo trì không tồn tại' });
    }
    
    res.json({ message: 'Xóa nhân viên bảo trì thành công' });
  });
});

// Thống kê bảo trì
router.get('/stats', (req, res) => {
  const { startDate, endDate, warehouseId } = req.query;
  
  let dateFilter = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = 'AND DATE(mp.plannedDate) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  if (warehouseId) {
    dateFilter += ' AND mp.warehouseId = ?';
    params.push(warehouseId);
  }
  
  const query = `
    SELECT 
      COUNT(*) as totalPlans,
      COUNT(CASE WHEN mp.status = 'planned' THEN 1 END) as plannedPlans,
      COUNT(CASE WHEN mp.status = 'in_progress' THEN 1 END) as inProgressPlans,
      COUNT(CASE WHEN mp.status = 'completed' THEN 1 END) as completedPlans,
      COUNT(CASE WHEN mp.status = 'cancelled' THEN 1 END) as cancelledPlans,
      COUNT(CASE WHEN mp.type = 'preventive' THEN 1 END) as preventivePlans,
      COUNT(CASE WHEN mp.type = 'corrective' THEN 1 END) as correctivePlans,
      COUNT(CASE WHEN mp.priority = 'high' THEN 1 END) as highPriorityPlans,
      COUNT(CASE WHEN mp.priority = 'medium' THEN 1 END) as mediumPriorityPlans,
      COUNT(CASE WHEN mp.priority = 'low' THEN 1 END) as lowPriorityPlans,
      SUM(mp.estimatedCost) as totalPlannedCost,
      AVG(mp.estimatedDuration) as averageDuration
    FROM maintenance_plans mp
    WHERE 1=1 ${dateFilter}
  `;
  
  db.get(query, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi database' });
    }
    
    // Tính toán thêm
    stats.completionRate = stats.totalPlans > 0 ? 
      (stats.completedPlans / stats.totalPlans * 100).toFixed(2) : 0;
    stats.averageDuration = stats.averageDuration ? stats.averageDuration.toFixed(1) : 0;
    
    res.json(stats);
  });
});

module.exports = router;
