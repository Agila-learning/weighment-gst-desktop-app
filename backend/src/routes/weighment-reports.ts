import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get Daily Weighments
router.get('/daily', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weighments = await prisma.weighment.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
        customer: true,
        material: true,
      }
    });
    res.json(weighments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching daily weighments' });
  }
});

// Helper to build date where clause
const getDateWhere = (fromDate?: string, toDate?: string) => {
  const where: any = {};
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }
  return where;
};

// Get Vehicle Report
router.get('/vehicles', async (req, res) => {
  try {
    const dateWhere = getDateWhere(req.query.fromDate as string, req.query.toDate as string);
    const weighments = await prisma.weighment.groupBy({
      by: ['vehicleId', 'vehicleNumber'],
      _count: {
        id: true
      },
      _sum: {
        netWeight: true
      },
      where: {
        status: 'COMPLETED',
        ...dateWhere
      }
    });

    // Also get first and last weighment date for each vehicle
    // Since prisma groupBy doesn't support min/max on dates easily without full aggregate,
    // we could just fetch them if needed. For now we will return the basic aggregated stats.
    const report = weighments.map(w => ({
      vehicleId: w.vehicleId,
      vehicleNumber: w.vehicleNumber,
      totalTrips: w._count.id,
      totalLoad: w._sum.netWeight || 0
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle report' });
  }
});

// Get Material Report
router.get('/materials', async (req, res) => {
  try {
    const dateWhere = getDateWhere(req.query.fromDate as string, req.query.toDate as string);
    const weighments = await prisma.weighment.groupBy({
      by: ['materialId'],
      _count: {
        id: true
      },
      _sum: {
        netWeight: true
      },
      where: {
        status: 'COMPLETED',
        materialId: { not: null },
        ...dateWhere
      }
    });

    // Fetch material names
    const materials = await prisma.material.findMany();
    
    const report = weighments.map(w => {
      const mat = materials.find(m => m.id === w.materialId);
      return {
        materialId: w.materialId,
        materialName: mat?.name || 'Unknown',
        totalTrips: w._count.id,
        totalLoad: w._sum.netWeight || 0
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching material report' });
  }
});

// Get Customer Report
router.get('/customers', async (req, res) => {
  try {
    const dateWhere = getDateWhere(req.query.fromDate as string, req.query.toDate as string);
    const weighments = await prisma.weighment.groupBy({
      by: ['customerId'],
      _count: {
        id: true
      },
      _sum: {
        netWeight: true
      },
      where: {
        status: 'COMPLETED',
        customerId: { not: null },
        ...dateWhere
      }
    });

    const customers = await prisma.customer.findMany();

    const report = weighments.map(w => {
      const cust = customers.find(c => c.id === w.customerId);
      return {
        customerId: w.customerId,
        customerName: cust?.name || 'Unknown',
        totalTrips: w._count.id,
        totalLoad: w._sum.netWeight || 0
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer report' });
  }
});

// Get Driver Report
router.get('/drivers', async (req, res) => {
  try {
    const dateWhere = getDateWhere(req.query.fromDate as string, req.query.toDate as string);
    const weighments = await prisma.weighment.groupBy({
      by: ['driverId'],
      _count: { id: true },
      _sum: { netWeight: true },
      where: { status: 'COMPLETED', driverId: { not: null }, ...dateWhere }
    });

    const drivers = await prisma.driver.findMany();

    const report = weighments.map(w => {
      const dr = drivers.find(d => d.id === w.driverId);
      return {
        driverId: w.driverId,
        driverName: dr?.name || 'Unknown',
        totalTrips: w._count.id,
        totalLoad: w._sum.netWeight || 0
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver report' });
  }
});

// Get Transporter Report
router.get('/transporters', async (req, res) => {
  try {
    const dateWhere = getDateWhere(req.query.fromDate as string, req.query.toDate as string);
    const weighments = await prisma.weighment.groupBy({
      by: ['transporterId'],
      _count: { id: true },
      _sum: { netWeight: true },
      where: { status: 'COMPLETED', transporterId: { not: null }, ...dateWhere }
    });

    const transporters = await prisma.transporter.findMany();

    const report = weighments.map(w => {
      const tr = transporters.find(t => t.id === w.transporterId);
      return {
        transporterId: w.transporterId,
        transporterName: tr?.name || 'Unknown',
        totalTrips: w._count.id,
        totalLoad: w._sum.netWeight || 0
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transporter report' });
  }
});

// Get Dashboard Stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVehicles = await prisma.weighment.count({
      where: { createdAt: { gte: today } }
    });

    const firstWeights = await prisma.weighment.count({
      where: { 
        createdAt: { gte: today },
        firstWeight: { not: null }
      }
    });

    const pending = await prisma.weighment.count({
      where: { status: 'WAITING_FOR_SECOND_WEIGHT' }
    });

    const cancelled = await prisma.weighment.count({
      where: { 
        createdAt: { gte: today },
        status: 'CANCELLED' 
      }
    });

    const completed = await prisma.weighment.count({
      where: { 
        createdAt: { gte: today },
        status: 'COMPLETED' 
      }
    });

    const loadAgg = await prisma.weighment.aggregate({
      _sum: { netWeight: true },
      where: {
        createdAt: { gte: today },
        status: 'COMPLETED'
      }
    });

    const totalLoad = loadAgg._sum.netWeight || 0;
    const totalLoadTon = totalLoad / 1000;

    res.json({
      todayVehicles,
      firstWeights,
      pending,
      cancelled,
      completed,
      totalLoad: totalLoadTon
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

export default router;
