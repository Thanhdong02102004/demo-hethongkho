# 🏭 Hệ Thống Quản Lý Kho - Warehouse Management System

Hệ thống quản lý kho hoàn chỉnh với backend API Node.js + SQLite và giao diện web HTML/CSS/JavaScript.

## ✨ Tính Năng Chính

### 📊 Quản Lý Kho
- **Quản lý sản phẩm**: Thêm, sửa, xóa, tìm kiếm sản phẩm
- **Quản lý kho**: Nhiều kho với thông tin chi tiết
- **Quản lý vị trí**: Vị trí lưu trữ trong từng kho
- **Đơn vị đo**: Hỗ trợ nhiều đơn vị đo khác nhau

### 🔄 Nghiệp Vụ Kho
- **Nhập kho**: Quản lý hàng nhập từ nhà cung cấp
- **Xuất kho**: Quản lý hàng xuất cho khách hàng
- **Chuyển kho**: Chuyển hàng giữa các kho
- **Điều chỉnh**: Điều chỉnh tồn kho
- **Kiểm kê**: Báo cáo tồn kho theo thời gian thực

### 👥 Quản Lý Khách Hàng & Hóa Đơn
- **Khách hàng**: Thông tin chi tiết, lịch sử giao dịch
- **Hóa đơn**: Tạo và quản lý hóa đơn với chi tiết từng mặt hàng
- **Tính toán**: Tự động tính thuế và tổng tiền

### 🛠️ Bảo Trì & Sự Cố
- **Kế hoạch bảo trì**: Lập kế hoạch bảo trì định kỳ
- **Theo dõi tiến độ**: Cập nhật trạng thái bảo trì
- **Báo cáo sự cố**: Ghi nhận và xử lý sự cố
- **Nhân viên bảo trì**: Quản lý đội ngũ bảo trì

### 📈 Báo Cáo & Thống Kê
- **Dashboard**: Tổng quan hệ thống với KPIs
- **Biểu đồ**: Phân tích doanh thu, lợi nhuận, tồn kho
- **Báo cáo**: Xuất báo cáo chi tiết theo nhiều tiêu chí

### 🔐 Bảo Mật
- **Xác thực**: Đăng nhập với JWT token
- **Phân quyền**: Role-based access control
- **Mã hóa**: Password được hash với bcrypt

## 🚀 Cài Đặt & Khởi Chạy

### Yêu Cầu Hệ Thống
- Node.js 16.x trở lên
- npm hoặc yarn
- Windows 10/11 (hoặc Linux/macOS)

### Bước 1: Cài Đặt Node.js
1. Tải Node.js từ [https://nodejs.org/](https://nodejs.org/)
2. Cài đặt với tùy chọn mặc định
3. Kiểm tra: `node --version` và `npm --version`

### Bước 2: Khởi Chạy Hệ Thống
1. **Cách đơn giản nhất**: Chạy file `start-server.bat`
2. **Cách thủ công**:
   ```bash
   # Cài đặt dependencies
   npm install
   
   # Khởi tạo database
   npm run init-db
   
   # Khởi động server
   npm start
   ```

### Bước 3: Truy Cập Hệ Thống
- **Giao diện web**: http://localhost:3000
- **API endpoints**: http://localhost:3000/api/
- **Đăng nhập**: admin / admin123

## 📁 Cấu Trúc Dự Án

```
ADASDS/
├── package.json              # Dependencies và scripts
├── server.js                 # Server chính
├── init-database.js          # Khởi tạo database
├── start-server.bat          # Script khởi động Windows
├── README.md                 # Hướng dẫn này
├── routes/                   # API routes
│   ├── auth.js              # Xác thực
│   ├── products.js          # Quản lý sản phẩm
│   ├── transactions.js      # Giao dịch kho
│   ├── warehouses.js        # Quản lý kho
│   ├── customers.js         # Quản lý khách hàng
│   ├── invoices.js          # Quản lý hóa đơn
│   ├── locations.js         # Quản lý vị trí
│   └── maintenance.js       # Bảo trì & sự cố
├── site/                     # Giao diện web
│   ├── home.html            # Trang chủ
│   ├── catalog.html         # Danh mục sản phẩm
│   ├── operations.html      # Nghiệp vụ kho
│   ├── locations.html       # Quản lý vị trí
│   ├── maintenance.html     # Bảo trì kho
│   ├── reports.html         # Báo cáo
│   ├── search.html          # Tìm kiếm
│   ├── customers.html       # Quản lý khách hàng
│   ├── invoices.html        # Quản lý hóa đơn
│   ├── users.html           # Quản lý người dùng
│   ├── qr-demo.html         # Demo QR code
│   ├── test-qr.html         # Test chức năng
│   └── assets/              # CSS, JS, images
└── warehouse.db              # Database SQLite (tự động tạo)
```

## 🗄️ Cấu Trúc Database

### Bảng Chính
- **users**: Người dùng hệ thống
- **warehouses**: Thông tin kho
- **locations**: Vị trí trong kho
- **products**: Sản phẩm
- **transactions**: Giao dịch kho
- **customers**: Khách hàng
- **invoices**: Hóa đơn
- **maintenance_plans**: Kế hoạch bảo trì
- **incidents**: Sự cố

### Quan Hệ
- Một kho có nhiều vị trí
- Một sản phẩm thuộc về một kho và vị trí
- Giao dịch liên kết sản phẩm, kho, và vị trí
- Hóa đơn có nhiều mặt hàng

## 🔌 API Endpoints

### Xác Thực
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/verify` - Kiểm tra token
- `PUT /api/auth/change-password` - Đổi password

### Sản Phẩm
- `GET /api/products` - Lấy danh sách sản phẩm
- `POST /api/products` - Tạo sản phẩm mới
- `PUT /api/products/:id` - Cập nhật sản phẩm
- `DELETE /api/products/:id` - Xóa sản phẩm
- `GET /api/products/:id/stock` - Lấy tồn kho

### Giao Dịch
- `GET /api/transactions` - Lấy danh sách giao dịch
- `POST /api/transactions` - Tạo giao dịch mới
- `POST /api/transactions/transfer` - Chuyển kho
- `POST /api/transactions/adjustment` - Điều chỉnh kho
- `GET /api/transactions/stats/summary` - Thống kê tổng quan
- `GET /api/transactions/stats/daily` - Thống kê theo ngày

## 🎯 Sử Dụng

### 1. Đăng Nhập
- Mở trình duyệt: http://localhost:3000
- Đăng nhập với: admin / admin123

### 2. Quản Lý Sản Phẩm
- Vào "Danh mục" để thêm/sửa/xóa sản phẩm
- Mỗi sản phẩm có SKU, mô tả, nhà sản xuất
- Gán kho và vị trí lưu trữ

### 3. Thực Hiện Giao Dịch
- Vào "Nghiệp vụ kho" để nhập/xuất/chuyển kho
- Chọn loại giao dịch, sản phẩm, số lượng
- Hệ thống tự động kiểm tra tồn kho

### 4. Xem Báo Cáo
- Vào "Báo cáo - Thống kê" để xem biểu đồ
- Phân tích doanh thu, lợi nhuận, tồn kho
- Xuất báo cáo theo định dạng mong muốn

### 5. Quản Lý Bảo Trì
- Vào "Bảo trì kho" để lập kế hoạch
- Theo dõi tiến độ bảo trì
- Báo cáo sự cố khi cần

## 🔧 Tùy Chỉnh

### Thay Đổi Cấu Hình
- **Port server**: Sửa `PORT` trong `server.js`
- **Database**: Thay đổi `warehouse.db` trong `server.js`
- **JWT Secret**: Sửa `JWT_SECRET` trong `routes/auth.js`

### Thêm Tính Năng Mới
1. Tạo route mới trong thư mục `routes/`
2. Import và sử dụng trong `server.js`
3. Tạo giao diện tương ứng trong thư mục `site/`

### Kết Nối Database Khác
- **MySQL**: Thay `sqlite3` bằng `mysql2`
- **PostgreSQL**: Thay `sqlite3` bằng `pg`
- **MongoDB**: Thay `sqlite3` bằng `mongodb`

## 🐛 Xử Lý Sự Cố

### Server Không Khởi Động
- Kiểm tra Node.js đã cài đặt: `node --version`
- Kiểm tra port 3000 có bị chiếm không
- Xem log lỗi trong terminal

### Database Lỗi
- Xóa file `warehouse.db` và chạy lại `npm run init-db`
- Kiểm tra quyền ghi file trong thư mục

### Giao Diện Không Hiển Thị
- Kiểm tra server có chạy không: http://localhost:3000/api/health
- Xem Console trong Developer Tools của trình duyệt

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra log lỗi trong terminal
2. Xem Console của trình duyệt
3. Kiểm tra kết nối database
4. Đảm bảo tất cả dependencies đã cài đặt

## 🚀 Phát Triển Tương Lai

- [ ] Giao diện mobile responsive
- [ ] Real-time notifications
- [ ] Export PDF/Excel
- [ ] Backup database tự động
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Integration với ERP systems

---

**Phiên bản**: 1.0.0  
**Cập nhật**: 2024  
**Tác giả**: Warehouse Management Team
