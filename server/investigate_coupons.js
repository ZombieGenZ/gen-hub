const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.coupon.findMany({
    select: {
        code: true,
        is_active: true,
        min_order_amount: true,
        max_discount_amount: true,
        require_min_order_value: true,
        apply_for_first_rental: true,
        apply_for_all_warehouses: true
    }
}).then(console.log).finally(() => prisma.$disconnect());
