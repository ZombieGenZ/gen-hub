
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgId = '304fe7b5-c4e5-47ab-a2e7-7c91deb4974b';
  
  console.log(`Investigating Org: ${orgId}`);
  
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, owner_id: true, is_deleted: true }
  });
  
  if (!org) {
    console.log('Org NOT FOUND');
    return;
  }
  
  console.log('Org info:', JSON.stringify(org, null, 2));
  
  const members = await prisma.organizationMember.findMany({
    where: { organization_id: orgId },
    select: {
      id: true,
      user_id: true,
      is_active: true,
      is_accepted: true,
      is_deleted: true,
      user: {
        select: {
            id: true,
            email: true,
            full_name: true
        }
      }
    }
  });
  
  console.log('Members count:', members.length);
  console.log('Members details:', JSON.stringify(members, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
