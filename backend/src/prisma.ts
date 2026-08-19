import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const result = await query(args);
        
        if (['create', 'update', 'delete'].includes(operation) && model !== 'AuditLog') {
          try {
            // Find a valid user to satisfy the foreign key constraint
            const defaultUser = await basePrisma.user.findFirst();
            if (defaultUser) {
              await basePrisma.auditLog.create({
                data: {
                  userId: defaultUser.id,
                  action: operation.toUpperCase(),
                  entity: model || 'Unknown',
                  entityId: (result as any)?.id || 'N/A',
                  details: JSON.stringify((args as any)?.data || {})
                }
              });
            }
          } catch (e) {
            console.error('Failed to write audit log', e);
          }
        }
        
        return result;
      }
    }
  }
});

export default prisma;
