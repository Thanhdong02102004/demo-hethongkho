@echo off
echo ========================================
echo    WAREHOUSE MANAGEMENT SYSTEM
echo ========================================
echo.
echo 🚀 Đang khởi động server...
echo.

REM Kiểm tra Node.js đã cài đặt chưa
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Lỗi: Node.js chưa được cài đặt!
    echo 📥 Vui lòng tải và cài đặt Node.js từ: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Kiểm tra package.json
if not exist "package.json" (
    echo ❌ Lỗi: Không tìm thấy package.json!
    echo 📁 Vui lòng chạy script này từ thư mục gốc của dự án
    echo.
    pause
    exit /b 1
)

REM Cài đặt dependencies nếu chưa có
if not exist "node_modules" (
    echo 📦 Đang cài đặt dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Lỗi cài đặt dependencies!
        pause
        exit /b 1
    )
    echo ✅ Đã cài đặt dependencies thành công!
    echo.
)

REM Khởi tạo database nếu chưa có
if not exist "warehouse.db" (
    echo 🗄️ Đang khởi tạo database...
    npm run init-db
    if %errorlevel% neq 0 (
        echo ❌ Lỗi khởi tạo database!
        pause
        exit /b 1
    )
    echo ✅ Đã khởi tạo database thành công!
    echo.
)

echo 🌐 Server sẽ chạy tại: http://localhost:3000
echo 📊 API endpoints: http://localhost:3000/api/
echo 🔑 Đăng nhập: admin / admin123
echo.
echo 💡 Nhấn Ctrl+C để dừng server
echo.

REM Khởi động server
npm start

pause
