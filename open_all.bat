@echo off
echo ========================================
echo    HỆ THỐNG QUẢN LÝ KHO HOÀN CHỈNH
echo ========================================
echo.
echo Đang mở các trang chính...
echo.

echo 1. Trang chủ (Dashboard)...
start "" "%~dp0site\home.html"

echo 2. Danh mục (Quản lý sản phẩm, kho, vị trí)...
start "" "%~dp0site\catalog.html"

echo 3. Nghiệp vụ kho (Nhập, xuất, chuyển, điều chỉnh)...
start "" "%~dp0site\operations.html"

echo 4. Vị trí kho (Quản lý vị trí, bản đồ kho)...
start "" "%~dp0site\locations.html"

echo 5. Bảo trì kho (Kế hoạch, theo dõi, sự cố)...
start "" "%~dp0site\maintenance.html"

echo 6. Báo cáo & Thống kê...
start "" "%~dp0site\reports.html"

echo 7. Tra cứu & Tìm kiếm...
start "" "%~dp0site\search.html"

echo 8. Khách hàng...
start "" "%~dp0site\customers.html"

echo 9. Hóa đơn...
start "" "%~dp0site\invoices.html"

echo 10. Người dùng...
start "" "%~dp0site\users.html"

echo.
echo ========================================
echo Tất cả trang đã được mở!
echo.
echo CÁC CHỨC NĂNG MỚI ĐÃ THÊM:
echo ✓ Chuyển kho giữa các kho
echo ✓ Điều chỉnh tồn kho
echo ✓ Quản lý vị trí chi tiết
echo ✓ Bản đồ kho trực quan
echo ✓ Lập kế hoạch bảo trì
echo ✓ Theo dõi tiến độ bảo trì
echo ✓ Báo cáo sự cố
echo ✓ Quản lý nhân viên bảo trì
echo ✓ Gán sản phẩm vào vị trí
echo ✓ Báo cáo tồn kho nâng cao
echo.
echo ========================================
pause
