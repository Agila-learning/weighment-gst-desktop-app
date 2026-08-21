import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.trim() === '') {
      return res.json({ customers: [], vehicles: [], invoices: [] });
    }

    const searchTerm = query.trim();

    // Parallel queries to fetch up to 5 of each entity type
    const [customers, vehicles, invoices] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { gstin: { contains: searchTerm, mode: 'insensitive' } }
          ],
          isActive: true
        },
        take: 5
      }),
      prisma.vehicle.findMany({
        where: {
          vehicleNumber: { contains: searchTerm, mode: 'insensitive' },
          isActive: true
        },
        take: 5
      }),
      prisma.invoice.findMany({
        where: {
          invoiceNumber: { contains: searchTerm, mode: 'insensitive' },
          isDeleted: false
        },
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { vehicleNumber: true } }
        },
        take: 5
      })
    ]);

    res.json({
      customers,
      vehicles,
      invoices
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
});

export default router;
