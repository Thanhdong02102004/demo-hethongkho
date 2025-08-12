const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./warehouse.db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'warehouse-secret-key-2024';

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập username và password' });
    }

    // Tìm user trong database
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Lỗi database' });
        }
        
        if (!user) {
          return res.status(401).json({ error: 'Username hoặc password không đúng' });
        }

        // Kiểm tra password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Username hoặc password không đúng' });
        }

        // Tạo JWT token
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username, 
            role: user.role 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Đăng nhập thành công',
          token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            email: user.email
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Đăng ký (chỉ admin)
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName, email, role } = req.body;
    
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Kiểm tra username đã tồn tại
    db.get(
      'SELECT id FROM users WHERE username = ?',
      [username],
      async (err, existingUser) => {
        if (err) {
          return res.status(500).json({ error: 'Lỗi database' });
        }
        
        if (existingUser) {
          return res.status(400).json({ error: 'Username đã tồn tại' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Tạo user mới
        db.run(
          'INSERT INTO users (username, password, fullName, email, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [username, hashedPassword, fullName, email, role || 'user', new Date().toISOString()],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Lỗi tạo user' });
            }
            
            res.status(201).json({
              message: 'Tạo user thành công',
              userId: this.lastID
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Kiểm tra token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Không có token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      valid: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
});

// Đổi password
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Không có token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Lấy user hiện tại
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId],
      async (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: 'User không tồn tại' });
        }

        // Kiểm tra password hiện tại
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ error: 'Password hiện tại không đúng' });
        }

        // Hash password mới
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // Cập nhật password
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedNewPassword, decoded.userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Lỗi cập nhật password' });
            }
            
            res.json({ message: 'Đổi password thành công' });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
