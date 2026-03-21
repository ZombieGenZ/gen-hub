"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BuildingStorefrontIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function CustomerDashboardPage() {
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Chào mừng bạn!</h2>
                    <p className="text-muted-foreground">
                        Khám phá và thuê kho bãi phù hợp với nhu cầu của bạn.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bạn chưa thuộc tổ chức nào</CardTitle>
                        <BuildingStorefrontIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="mt-2 mb-4">
                            Đăng ký tổ chức để sử dụng đầy đủ các tính năng quản lý kho, theo dõi nhập xuất và tồn kho thực tế.
                        </CardDescription>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/customer/organization-settings">
                                Đăng ký tổ chức <ArrowRightIcon className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
