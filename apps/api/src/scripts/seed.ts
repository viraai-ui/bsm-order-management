import { prisma } from '../lib/prisma.js';
import { seedDispatchData } from '../repositories/dispatchRepository.js';

async function main() {
  await seedDispatchData(prisma);
  console.log('Dispatch seed data ready');
}

main()
  .catch((error) => {
    console.error('Failed to seed dispatch data', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
