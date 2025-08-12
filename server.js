const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from site directory
app.use(express.static(path.join(__dirname, 'site')));

// Database connection
const db = new sqlite3.Database('./warehouse.db', (err) => {
  if (err) {
    console.error('Lỗi kết nối database:', err.message);
  } else {
    console.log('✅ Đã kết nối database SQLite thành công');
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const warehouseRoutes = require('./routes/warehouses');
const transactionRoutes = require('./routes/transactions');
const customerRoutes = require('./routes/customers');
const invoiceRoutes = require('./routes/invoices');
const reportRoutes = require('./routes/reports');
const locationRoutes = require('./routes/locations');
const maintenanceRoutes = require('./routes/maintenance');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Warehouse Management API đang hoạt động',
    timestamp: new Date().toISOString()
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'home.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err.stack);
  res.status(500).json({ 
    error: 'Lỗi server nội bộ',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint không tồn tại' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`🌐 Giao diện web: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Đang tắt server...');
  db.close((err) => {
    if (err) {
      console.error('Lỗi đóng database:', err.message);
    } else {
      console.log('✅ Đã đóng database');
    }
    process.exit(0);
  });
});

module.exports = { app };
