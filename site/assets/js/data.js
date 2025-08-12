function seedDemoData(force=false){
  const seeded=storage.get('seeded',false);if(seeded&&!force)return;
  
  // Fallback for crypto.randomUUID() if not available
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  const users=[
    {id:generateId(),username:'admin',password:'123456',fullName:'Quản trị viên',role:'Admin',active:true},
    {id:generateId(),username:'manager',password:'123456',fullName:'Quản lý kho',role:'Manager',active:true},
    {id:generateId(),username:'staff',password:'123456',fullName:'Nhân viên kho',role:'Staff',active:true},
    {id:generateId(),username:'kho_a',password:'123456',fullName:'Nhân viên kho A',role:'Staff',active:true},
    {id:generateId(),username:'kho_b',password:'123456',fullName:'Nhân viên kho B',role:'Staff',active:true}
  ];
  const warehouses=[
    {id:generateId(),code:'KHO1',name:'Kho chính',location:'KCN A',areaTotal:1200,areaFree:800,pricePerM2:120000,type:'Thường',isCold:false},
    {id:generateId(),code:'KHO2',name:'Kho lạnh',location:'KCN B',areaTotal:600,areaFree:350,pricePerM2:180000,type:'Lạnh',isCold:true},
    {id:generateId(),code:'KHO3',name:'Kho nguy hiểm',location:'KCN C',areaTotal:400,areaFree:250,pricePerM2:200000,type:'Nguy hiểm',isCold:false},
    {id:generateId(),code:'KHO4',name:'Kho cao cấp',location:'KCN D',areaTotal:800,areaFree:600,pricePerM2:150000,type:'Cao cấp',isCold:false},
    {id:generateId(),code:'KHO5',name:'Kho tự động',location:'KCN E',areaTotal:1000,areaFree:700,pricePerM2:300000,type:'Tự động',isCold:false}
  ];
  const products=[
    {id:generateId(),code:'SP001',name:'Thùng carton',uom:'Cái',price:15000,barcode:'893000000001'},
    {id:generateId(),code:'SP002',name:'Băng keo',uom:'Cuộn',price:12000,barcode:'893000000002'},
    {id:generateId(),code:'SP003',name:'Pallet nhựa',uom:'Cái',price:250000,barcode:'893000000003'},
    {id:generateId(),code:'SP004',name:'Túi nilon',uom:'Kiện',price:8000,barcode:'893000000004'},
    {id:generateId(),code:'SP005',name:'Dây đai',uom:'Cuộn',price:35000,barcode:'893000000005'},
    {id:generateId(),code:'SP006',name:'Máy in nhãn',uom:'Cái',price:1200000,barcode:'893000000006'},
    {id:generateId(),code:'SP007',name:'Giấy in',uom:'Ream',price:65000,barcode:'893000000007'},
    {id:generateId(),code:'SP008',name:'Kệ sắt',uom:'Bộ',price:850000,barcode:'893000000008'},
    {id:generateId(),code:'SP009',name:'Xe nâng tay',uom:'Cái',price:2500000,barcode:'893000000009'},
    {id:generateId(),code:'SP010',name:'Hộp nhựa',uom:'Cái',price:45000,barcode:'893000000010'},
    {id:generateId(),code:'EL001',name:'Máy tính bảng',uom:'Cái',price:3500000,barcode:'893000000011'},
    {id:generateId(),code:'EL002',name:'Máy quét mã vạch',uom:'Cái',price:750000,barcode:'893000000012'},
    {id:generateId(),code:'EL003',name:'Camera an ninh',uom:'Cái',price:1800000,barcode:'893000000013'},
    {id:generateId(),code:'TX001',name:'Áo bảo hộ',uom:'Cái',price:120000,barcode:'893000000014'},
    {id:generateId(),code:'TX002',name:'Găng tay',uom:'Đôi',price:25000,barcode:'893000000015'},
    {id:generateId(),code:'FD001',name:'Gạo tám xoan',uom:'Bao',price:850000,barcode:'893000000016'},
    {id:generateId(),code:'FD002',name:'Dầu ăn',uom:'Thùng',price:480000,barcode:'893000000017'},
    {id:generateId(),code:'FD003',name:'Sữa tươi',uom:'Hộp',price:65000,barcode:'893000000018'},
    {id:generateId(),code:'FD004',name:'Bánh mì sandwich',uom:'Gói',price:35000,barcode:'893000000019'},
    {id:generateId(),code:'FD005',name:'Nước khoáng',uom:'Thùng',price:120000,barcode:'893000000020'},
    {id:generateId(),code:'BV001',name:'Chai thủy tinh',uom:'Cái',price:8000,barcode:'893000000021'},
    {id:generateId(),code:'BV002',name:'Lon nhôm',uom:'Cái',price:2500,barcode:'893000000022'},
    {id:generateId(),code:'BV003',name:'Hộp giấy',uom:'Cái',price:5000,barcode:'893000000023'},
    {id:generateId(),code:'BV004',name:'Túi zip',uom:'Kiện',price:45000,barcode:'893000000024'},
    {id:generateId(),code:'CM001',name:'Xi măng PCB40',uom:'Bao',price:165000,barcode:'893000000025'},
    {id:generateId(),code:'CM002',name:'Gạch đỏ',uom:'Viên',price:850,barcode:'893000000026'},
    {id:generateId(),code:'CM003',name:'Cát xây dựng',uom:'Khối',price:320000,barcode:'893000000027'},
    {id:generateId(),code:'CM004',name:'Thép xây dựng',uom:'Cây',price:450000,barcode:'893000000028'},
    {id:generateId(),code:'CM005',name:'Ống nhựa PVC',uom:'Cây',price:85000,barcode:'893000000029'},
    {id:generateId(),code:'CH001',name:'Axit sulfuric',uom:'Lít',price:35000,barcode:'893000000030'},
    {id:generateId(),code:'CH002',name:'Natri hydroxide',uom:'Kg',price:28000,barcode:'893000000031'},
    {id:generateId(),code:'CH003',name:'Cồn y tế',uom:'Lít',price:45000,barcode:'893000000032'},
    {id:generateId(),code:'CH004',name:'Dung môi acetone',uom:'Lít',price:65000,barcode:'893000000033'},
    {id:generateId(),code:'AU001',name:'Lốp xe tải',uom:'Cái',price:3200000,barcode:'893000000034'},
    {id:generateId(),code:'AU002',name:'Ắc quy ô tô',uom:'Cái',price:1850000,barcode:'893000000035'},
    {id:generateId(),code:'AU003',name:'Dầu nhớt',uom:'Lít',price:180000,barcode:'893000000036'},
    {id:generateId(),code:'AU004',name:'Phanh xe',uom:'Bộ',price:650000,barcode:'893000000037'},
    {id:generateId(),code:'ME001',name:'Thuốc paracetamol',uom:'Hộp',price:25000,barcode:'893000000038'},
    {id:generateId(),code:'ME002',name:'Băng y tế',uom:'Cuộn',price:15000,barcode:'893000000039'},
    {id:generateId(),code:'ME003',name:'Khẩu trang y tế',uom:'Hộp',price:85000,barcode:'893000000040'},
    {id:generateId(),code:'ME004',name:'Cồn sát khuẩn',uom:'Chai',price:35000,barcode:'893000000041'},
    {id:generateId(),code:'BK001',name:'Sách giáo khoa',uom:'Cuốn',price:45000,barcode:'893000000042'},
    {id:generateId(),code:'BK002',name:'Vở học sinh',uom:'Cuốn',price:8000,barcode:'893000000043'},
    {id:generateId(),code:'BK003',name:'Bút bi',uom:'Cái',price:3500,barcode:'893000000044'},
    {id:generateId(),code:'BK004',name:'Thước kẻ',uom:'Cái',price:12000,barcode:'893000000045'},
    {id:generateId(),code:'SP001',name:'Máy photocopy',uom:'Cái',price:15000000,barcode:'893000000046'},
    {id:generateId(),code:'SP002',name:'Máy fax',uom:'Cái',price:3500000,barcode:'893000000047'},
    {id:generateId(),code:'SP003',name:'Bàn văn phòng',uom:'Cái',price:2500000,barcode:'893000000048'},
    {id:generateId(),code:'SP004',name:'Ghế xoay',uom:'Cái',price:1200000,barcode:'893000000049'},
    {id:generateId(),code:'CL001',name:'Áo thun cotton',uom:'Cái',price:120000,barcode:'893000000050'},
    {id:generateId(),code:'CL002',name:'Quần jean',uom:'Cái',price:350000,barcode:'893000000051'},
    {id:generateId(),code:'CL003',name:'Giày thể thao',uom:'Đôi',price:850000,barcode:'893000000052'},
    {id:generateId(),code:'CL004',name:'Túi xách',uom:'Cái',price:450000,barcode:'893000000053'},
    {id:generateId(),code:'AG001',name:'Phân bón NPK',uom:'Bao',price:285000,barcode:'893000000054'},
    {id:generateId(),code:'AG002',name:'Thuốc trừ sâu',uom:'Chai',price:150000,barcode:'893000000055'},
    {id:generateId(),code:'AG003',name:'Hạt giống lúa',uom:'Kg',price:45000,barcode:'893000000056'},
    {id:generateId(),code:'AG004',name:'Máy phun thuốc',uom:'Cái',price:2800000,barcode:'893000000057'}
  ];
  const uoms=[
    {id:generateId(),code:'CAI',name:'Cái'},
    {id:generateId(),code:'CUON',name:'Cuộn'},
    {id:generateId(),code:'THUNG',name:'Thùng'},
    {id:generateId(),code:'KG',name:'Kilogram'},
    {id:generateId(),code:'HOP',name:'Hộp'}
  ];
  const locations=[];
  const loc = (warehouseId, code, name, capacity)=>({id:generateId(),warehouseId,code,name,capacity});
  locations.push(loc(warehouses[0].id,'A1','Dãy A - Ô 1',200));
  locations.push(loc(warehouses[0].id,'A2','Dãy A - Ô 2',200));
  locations.push(loc(warehouses[1].id,'COLD-01','Kho lạnh - Kệ 01',100));

  const skus=[];
  const sku = (productId, skuCode, barcode, isDefault)=>({id:generateId(),productId,skuCode,barcode,isDefault:!!isDefault});
  skus.push(sku(products[0].id,'SP001-01','893000000001',true));
  skus.push(sku(products[0].id,'CTN-L','893000000011',false));
  skus.push(sku(products[1].id,'SP002-CLR','893000000021',true));

  // Tạo giao dịch mẫu cho 30 ngày gần đây
  const transactions = [];
  const now = new Date();
  
  // Tạo 80 giao dịch ngẫu nhiên trong 30 ngày
  for(let i = 0; i < 80; i++) {
    const dayOffset = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    
    const isIn = Math.random() > 0.4; // 60% nhập, 40% xuất
    const whId = warehouses[Math.floor(Math.random() * warehouses.length)].id;
    const numLines = Math.floor(Math.random() * 3) + 1; // 1-3 dòng
    
    const lines = [];
    for(let j = 0; j < numLines; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 20) + 1; // 1-20 số lượng
      lines.push({ productId: product.id, qty });
    }
    
    transactions.push({
      id: generateId(),
      type: isIn ? 'IN' : 'OUT',
      code: `${isIn ? 'PN' : 'PX'}-${Date.now()}-${i}`,
      warehouseId: whId,
      lines,
      createdAt: date.toISOString()
    });
  }

  storage.set('users',users);
  storage.set('warehouses',warehouses);
  storage.set('products',products);
  storage.set('uoms',uoms);
  storage.set('locations',locations);
  storage.set('skus',skus);
  storage.set('transactions',transactions);
  // Thêm dữ liệu khách hàng
  const customers = [
    {id: generateId(), code: 'KH001', name: 'Công ty TNHH ABC', phone: '0901234567', email: 'abc@email.com', address: '123 Đường ABC, Q1, TP.HCM', taxCode: '0123456789', contactPerson: 'Nguyễn Văn A', status: 'active'},
    {id: generateId(), code: 'KH002', name: 'Công ty CP XYZ', phone: '0909876543', email: 'xyz@email.com', address: '456 Đường XYZ, Q3, TP.HCM', taxCode: '0987654321', contactPerson: 'Trần Thị B', status: 'active'},
    {id: generateId(), code: 'KH003', name: 'Công ty TNHH DEF', phone: '0905555555', email: 'def@email.com', address: '789 Đường DEF, Q7, TP.HCM', taxCode: '0555555555', contactPerson: 'Lê Văn C', status: 'active'},
    {id: generateId(), code: 'KH004', name: 'Công ty CP GHI', phone: '0901111111', email: 'ghi@email.com', address: '321 Đường GHI, Q2, TP.HCM', taxCode: '0111111111', contactPerson: 'Phạm Thị D', status: 'inactive'},
    {id: generateId(), code: 'KH005', name: 'Công ty TNHH JKL', phone: '0902222222', email: 'jkl@email.com', address: '654 Đường JKL, Q5, TP.HCM', taxCode: '0222222222', contactPerson: 'Hoàng Văn E', status: 'active'}
  ];

  // Thêm dữ liệu hợp đồng
  const contracts = [
    {id: generateId(), code: 'HD001', customerCode: 'KH001', customerName: 'Công ty TNHH ABC', type: 'Nhập hàng', value: 50000000, startDate: '2024-01-01', endDate: '2024-12-31', status: 'active', description: 'Hợp đồng cung cấp hàng hóa năm 2024'},
    {id: generateId(), code: 'HD002', customerCode: 'KH002', customerName: 'Công ty CP XYZ', type: 'Xuất hàng', value: 75000000, startDate: '2024-02-01', endDate: '2024-11-30', status: 'active', description: 'Hợp đồng phân phối sản phẩm'},
    {id: generateId(), code: 'HD003', customerCode: 'KH003', customerName: 'Công ty TNHH DEF', type: 'Nhập hàng', value: 30000000, startDate: '2024-03-01', endDate: '2024-08-31', status: 'completed', description: 'Hợp đồng mua nguyên vật liệu'},
    {id: generateId(), code: 'HD004', customerCode: 'KH001', customerName: 'Công ty TNHH ABC', type: 'Xuất hàng', value: 45000000, startDate: '2024-04-01', endDate: '2024-09-30', status: 'active', description: 'Hợp đồng bán thành phẩm'},
    {id: generateId(), code: 'HD005', customerCode: 'KH005', customerName: 'Công ty TNHH JKL', type: 'Nhập hàng', value: 60000000, startDate: '2024-05-01', endDate: '2024-10-31', status: 'pending', description: 'Hợp đồng cung cấp thiết bị'}
  ];

  // Thêm dữ liệu hóa đơn
  const invoices = [
    {id: generateId(), code: 'INV001', contractCode: 'HD001', customerCode: 'KH001', customerName: 'Công ty TNHH ABC', type: 'Nhập', totalAmount: 15000000, taxAmount: 1500000, totalWithTax: 16500000, issueDate: '2024-01-15', dueDate: '2024-02-15', status: 'paid', description: 'Hóa đơn nhập hàng tháng 1'},
    {id: generateId(), code: 'INV002', contractCode: 'HD002', customerCode: 'KH002', customerName: 'Công ty CP XYZ', type: 'Xuất', totalAmount: 25000000, taxAmount: 2500000, totalWithTax: 27500000, issueDate: '2024-02-20', dueDate: '2024-03-20', status: 'paid', description: 'Hóa đơn xuất hàng tháng 2'},
    {id: generateId(), code: 'INV003', contractCode: 'HD003', customerCode: 'KH003', customerName: 'Công ty TNHH DEF', type: 'Nhập', totalAmount: 10000000, taxAmount: 1000000, totalWithTax: 11000000, issueDate: '2024-03-10', dueDate: '2024-04-10', status: 'overdue', description: 'Hóa đơn nhập nguyên liệu'},
    {id: generateId(), code: 'INV004', contractCode: 'HD004', customerCode: 'KH001', customerName: 'Công ty TNHH ABC', type: 'Xuất', totalAmount: 18000000, taxAmount: 1800000, totalWithTax: 19800000, issueDate: '2024-04-05', dueDate: '2024-05-05', status: 'pending', description: 'Hóa đơn xuất thành phẩm'},
    {id: generateId(), code: 'INV005', contractCode: 'HD002', customerCode: 'KH002', customerName: 'Công ty CP XYZ', type: 'Xuất', totalAmount: 30000000, taxAmount: 3000000, totalWithTax: 33000000, issueDate: '2024-05-12', dueDate: '2024-06-12', status: 'pending', description: 'Hóa đơn xuất hàng tháng 5'}
  ];

  storage.set('customers', customers);
  storage.set('contracts', contracts);
  storage.set('invoices', invoices);
  storage.set('warehouseTypes',['Thường','Lạnh','Nguy hiểm','Cao cấp','Tự động','Xuất khẩu','Đông lạnh']);
  storage.set('seeded',true);
}
seedDemoData(false);


