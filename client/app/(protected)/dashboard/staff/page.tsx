import Link from "next/link";
import { ClipboardList, PackageSearch, Truck, Warehouse } from "lucide-react";

const quickActions = [
    {
        title: "Quản lý Nhập kho",
        description: "Theo dõi phiếu nhập và cập nhật trạng thái xử lý.",
        href: "/dashboard/staff/inbound",
        icon: Truck,
    },
    {
        title: "Quản lý Xuất kho",
        description: "Kiểm tra đơn xuất và điều phối giao nhận.",
        href: "/dashboard/staff/outbound",
        icon: ClipboardList,
    },
    {
        title: "Sản phẩm",
        description: "Tra cứu tồn kho và thông tin mặt hàng.",
        href: "/dashboard/staff/products",
        icon: PackageSearch,
    },
    {
        title: "Kho hàng",
        description: "Xem danh sách kho và tình trạng vận hành.",
        href: "/dashboard/staff/warehouses",
        icon: Warehouse,
    },
];

export default function StaffDashboardPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-foreground">Bảng điều khiển nhân viên</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Đây là luồng độc lập cho STAFF. Chọn tác vụ bên dưới để bắt đầu làm việc.
                    </p>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {quickActions.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                className="group rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="rounded-xl border bg-muted p-2.5 text-primary">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                                            {item.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </section>
            </div>
        </div>
    );
}