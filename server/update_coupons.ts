import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.coupon.updateMany({
        data: {
            apply_for_first_rental: true
        }
    });

    console.log(`Updated ${updated.count} coupons to apply_for_first_rental = true`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());