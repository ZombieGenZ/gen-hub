import Link from "next/link";
import { ShieldCheck, PackageSearch, Truck, ClipboardList } from "lucide-react";

const quickActions = [
    {
        title: "Vai trò nội bộ kho",
        description: "Xem và quản lý role nội bộ theo phạm vi được cấp.",
        href: "/dashboard/member/roles",
        icon: ShieldCheck,
    },
    {
        title: "Sản phẩm",
        description: "Tra cứu thông tin mặt hàng và danh mục nội bộ.",
        href: "/dashboard/member/products",
        icon: PackageSearch,
    },
    {
        title: "Phiếu nhập",
        description: "Theo dõi và xử lý luồng inbound hằng ngày.",
        href: "/dashboard/member/inbound",
        icon: Truck,
    },
    {
        title: "Phiếu xuất",
        description: "Theo dõi luồng outbound và trạng thái xử lý.",
        href: "/dashboard/member/outbound",
        icon: ClipboardList,
    },
];

export default function MemberDashboardPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-foreground">Bảng điều khiển Member</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Luồng riêng cho thành viên tổ chức. Chọn tác vụ phù hợp để bắt đầu.
                    </p>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {quickActions.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.title} href={item.href} className="group rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-md">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-xl border bg-muted p-2.5 text-primary">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-foreground group-hover:text-primary">{item.title}</h2>
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
