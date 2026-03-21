export const adminDashboardMock = {
    heroKPIs: {
        mrr: {
            value: 1250000000,
            trend: { value: 12.5, isPositive: true },
            label: "so với tháng trước",
        },
        organizationAndUsers: {
            orgs: 156,
            newUsersThisWeek: 45,
            trend: { value: 8.2, isPositive: true },
            label: "tăng trưởng user",
        },
        globalOccupancy: {
            rate: 82.5,
            trend: { value: 2.1, isPositive: true },
            label: "so với tuần trước",
            totalSpace: "12,500 m²",
            usedSpace: "10,312 m²",
        },
        debtAlerts: {
            totalAmount: 345000000,
            count: 12,
            trend: { value: 15.4, isPositive: false }, // Negative trend meaning debt increased
            label: "tăng so với tháng trước",
        }
    },
    actionableInbox: {
        tickets: [
            { id: "T-1042", title: "Kho A3 mốc rêu do mưa", org: "TechCorp DB", priority: "URGENT", time: "10 phút trước", status: "OPEN" },
            { id: "T-1043", title: "Yêu cầu cấp thêm thẻ ra vào", org: "Logistics Pro", priority: "HIGH", time: "1 giờ trước", status: "OPEN" },
            { id: "T-1044", title: "Cửa cuốn kho B2 kẹt", org: "Mega Store", priority: "URGENT", time: "2 giờ trước", status: "OPEN" }
        ],
        orgUpdates: [
            { id: "REQ-091", org: "Blue Ocean Co.", type: "Đổi Mã Số Thuế", time: "30 phút trước", status: "PENDING" },
            { id: "REQ-092", org: "Green Farm Ltd", type: "Đổi Người Đại Diện", time: "3 giờ trước", status: "PENDING" }
        ],
        refunds: [
            { id: "RF-221", org: "F&B Supply", amount: 15000000, reason: "Giảm diện tích thuê", time: "1 ngày trước", status: "PENDING" },
            { id: "RF-222", org: "Smart HomeVN", amount: 4500000, reason: "Hủy hợp đồng sớm", time: "2 ngày trước", status: "PENDING" }
        ],
        visitBookings: [
            { id: "VB-881", customerName: "Nguyễn Văn A", org: "Cá nhân", warehouse: "Phức hợp Kho Quận 9", time: "Vừa xong", status: "PENDING", date: "15/10/2026 09:00" },
            { id: "VB-882", customerName: "Trần Thị B", org: "Vinamilk", warehouse: "Kho Lạnh Tân Bình", time: "2 giờ trước", status: "PENDING", date: "16/10/2026 14:30" }
        ]
    },
    revenueAnalysis: {
        monthly: [
            { month: "T1", expected: 1100, actual: 1050 },
            { month: "T2", expected: 1150, actual: 1100 },
            { month: "T3", expected: 1200, actual: 1180 },
            { month: "T4", expected: 1250, actual: 1200 },
            { month: "T5", expected: 1300, actual: 1250 },
            { month: "T6", expected: 1350, actual: 1320 },
        ]
    },
    warehouseHeatmap: {
        topRevenue: [
            { id: "W-01", name: "Phức hợp Kho Quận 9", revenue: 450000000, occupancy: 95 },
            { id: "W-02", name: "Kho Tiêu chuẩn Tân Bình", revenue: 320000000, occupancy: 88 },
            { id: "W-03", name: "Kho Lạnh Bình Chánh", revenue: 280000000, occupancy: 92 },
            { id: "W-04", name: "Kho Mát Thủ Đức", revenue: 190000000, occupancy: 85 },
            { id: "W-05", name: "Kho Tài liệu Q3", revenue: 150000000, occupancy: 78 }
        ],
        mostEmpty: [
            { id: "W-06", name: "Kho Ngoại quan Cát Lái", revenue: 50000000, occupancy: 35 },
            { id: "W-07", name: "Kho Hóa chất Đồng Nai", revenue: 80000000, occupancy: 42 },
            { id: "W-08", name: "Kho Nông sản Củ Chi", revenue: 60000000, occupancy: 45 },
            { id: "W-09", name: "Kho Xây dựng Bình Dương", revenue: 90000000, occupancy: 50 },
            { id: "W-10", name: "Kho Ngoại quan Phú Mỹ", revenue: 110000000, occupancy: 52 }
        ]
    },
    activityFeed: [
        { id: 1, type: "ORGANIZATION", title: "Tổ chức ABC vừa xóa 5000 sản phẩm", time: "5 phút trước", user: "Nguyễn Văn Tool", avatar: "N" },
        { id: 2, type: "ADMIN", title: "Admin X vừa duyệt hoàn tiền 50 triệu", time: "30 phút trước", user: "Admin X", avatar: "A" },
        { id: 3, type: "CONTRACT", title: "Hợp đồng C-1092 vừa được gia hạn thêm 1 năm", time: "1 giờ trước", user: "System", avatar: "S" },
        { id: 4, type: "TICKET", title: "Nhân viên Y đã nhận xử lý sự cố cửa cuốn kho B2", time: "2 giờ trước", user: "Nhân viên Y", avatar: "Y" },
        { id: 5, type: "ORGANIZATION", title: "Tổ chức Mới Đăng Ký đã hoàn tất eKYC", time: "3 giờ trước", user: "System", avatar: "S" }
    ],
    systemHealth: {
        services: [
            { name: "Main API", status: "OK", latency: "45ms", uptime: "99.99%" },
            { name: "Database", status: "OK", latency: "12ms", uptime: "100%" },
            { name: "Redis Cache", status: "OK", latency: "2ms", uptime: "100%" },
            { name: "SePay (Payment)", status: "OK", latency: "120ms", uptime: "99.95%" },
            { name: "AI Service", status: "WARNING", latency: "850ms", uptime: "99.8%" }, // Example warning
            { name: "Email Service", status: "OK", latency: "230ms", uptime: "99.9%" }
        ],
        alerts: [
            { id: 1, level: "WARNING", message: "AI Service response time > 800ms trong 5 phút qua.", time: "Vừa xong" }
            // If empty, system is green.
        ]
    }
};
