import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const contractId = '6a2947b0-e046-41cd-9916-87c2062bebc6';
    const contract = await prisma.rentalContract.findFirst({
        where: { id: contractId },
        include: {
            payments: true,
        }
    });

    console.log('Contract:', JSON.stringify(contract, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
