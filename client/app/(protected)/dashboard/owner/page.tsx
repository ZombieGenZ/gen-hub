import Link from "next/link";
import { Settings, ShieldCheck, Users } from "lucide-react";

const quickActions = [
    {
        title: "Cài đặt tổ chức",
        description: "Quản lý hồ sơ tổ chức, thành viên và phân quyền.",
        href: "/dashboard/owner/organization-settings",
        icon: Settings,
    },
    {
        title: "Vai trò nội bộ kho",
        description: "Tạo và quản lý role nội bộ cho vận hành kho.",
        href: "/dashboard/owner/roles",
        icon: ShieldCheck,
    },
    {
        title: "Thành viên",
        description: "Theo dõi thành viên và trạng thái tham gia tổ chức.",
        href: "/dashboard/owner/organization-settings",
        icon: Users,
    },
];

export default function OwnerDashboardPage() {
    return (
        <div className="min-h-screen bg-background p-4 md:p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-foreground">Bảng điều khiển Owner</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Luồng riêng cho chủ tổ chức. Truy cập nhanh các nghiệp vụ quản trị bên dưới.
                    </p>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
