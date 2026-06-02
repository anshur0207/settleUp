const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) return console.log("No users");
  const user = users[0];
  
  console.log("Creating group...");
  const group = await prisma.group.create({
    data: {
      name: "Test Group",
      creatorId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'admin'
        }
      }
    }
  });
  
  console.log("Fetching group...");
  try {
    const fetched = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        pendingMembers: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, avatar: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            splits: true
          }
        }
      }
    });
    console.log("Fetched group successfully");
  } catch (e) {
    console.error("Error fetching group:", e);
  }
}
main().finally(() => prisma.$disconnect());
