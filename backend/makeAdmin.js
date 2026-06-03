const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address.');
    console.error('Usage: node makeAdmin.js <user-email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { isAdmin: true },
    });
    console.log(`✅ Success! The user ${user.name} (${user.email}) is now an Admin!`);
    console.log(`They can now access the Admin Dashboard when they log in.`);
  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Error: Could not find any user with the email "${email}".`);
    } else {
      console.error('❌ An unexpected error occurred:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
