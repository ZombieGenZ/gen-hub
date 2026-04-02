
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgId = '304fe7b5-c4e5-47ab-a2e7-7c91deb4974b';
  
  console.log(`[Investigate] Org ID: ${orgId}`);
  
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { 
      id: true, 
      name: true, 
      owner_id: true, 
      is_deleted: true,
      owner: { select: { id: true, email: true, name: true } }
    }
  });
  
  if (!org) {
    console.log('[Investigate] Org NOT FOUND in database.');
    return;
  }
  
  console.log('[Investigate] Org owner:', org.owner_id, `(${org.owner?.email})`);
  
  const members = await prisma.organizationMember.findMany({
    where: { organization_id: orgId },
    include: {
      user: { select: { id: true, email: true, name: true } }
    }
  });
  
  console.log(`[Investigate] Member count: ${members.length}`);
  members.forEach(m => {
    console.log(` - User: ${m.user_id} (${m.user?.email}), is_active: ${m.is_active}, is_accepted: ${m.is_accepted}, is_deleted: ${m.is_deleted}`);
  });

  // Also list all users in the system to see if we can find the one in the session
  const allUsers = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true, name: true }
  });
  console.log('[Investigate] System Users (first 5):');
  allUsers.forEach(u => console.log(` - ${u.id}: ${u.email}`));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
