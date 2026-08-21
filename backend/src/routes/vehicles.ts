import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles' });
  }
});

// Create vehicle
router.post('/', async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, transporterId, state, capacityWeight } = req.body;
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });
    
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber,
        vehicleType: vehicleType || null,
        transporterId: transporterId || null,
        state: state || null,
        capacityWeight: capacityWeight ? Number(capacityWeight) : null
      }
    });
    res.status(201).json(vehicle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A vehicle with this number already exists." });
    }
    res.status(500).json({ message: 'Error creating vehicle' });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, transporterId, state, capacityWeight } = req.body;
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        vehicleNumber,
        vehicleType: vehicleType || null,
        transporterId: transporterId || null,
        state: state || null,
        capacityWeight: capacityWeight ? Number(capacityWeight) : null
      }
    });
    res.json(vehicle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A vehicle with this number already exists." });
    }
    res.status(500).json({ message: 'Error updating vehicle' });
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: { invoices: true }
    });
    
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    
    if (vehicle.invoices.length > 0) {
      // Soft delete
      await prisma.vehicle.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });
    } else {
      // Hard delete
      await prisma.vehicle.delete({
        where: { id: req.params.id }
      });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vehicle' });
  }
});

// Get Vehicle History
router.get('/:vehicleNumber/summary', async (req, res) => {
  try {
    const { vehicleNumber } = req.params;
    const { fromDate, toDate, customerId, materialId, status, loadType } = req.query;

    const vehicle = await prisma.vehicle.findUnique({
      where: { vehicleNumber },
      include: { driver: true, transporter: true }
    });

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    let whereClause: any = { vehicleNumber };

    if (fromDate || toDate) {
      whereClause.date = {};
      if (fromDate) whereClause.date.gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        whereClause.date.lte = to;
      }
    }
    if (customerId) whereClause.customerId = customerId;
    if (materialId) whereClause.materialId = materialId;
    if (status) whereClause.status = status;
    if (loadType) whereClause.loadType = loadType;

    const weighments = await prisma.weighment.findMany({
      where: whereClause,
      include: { customer: true, material: true, driver: true, transporter: true },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate Summary
    const totalWeighments = weighments.length;
    const completedWeighments = weighments.filter(w => w.status === 'COMPLETED').length;
    const cancelledWeighments = weighments.filter(w => w.status === 'CANCELLED').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayWeighments = weighments.filter(w => w.status === 'COMPLETED' && new Date(w.createdAt) >= today);
    const todaysLoads = todayWeighments.length;
    const todaysTotalWeight = todayWeighments.reduce((sum, w) => sum + (w.netWeight || 0), 0);
    const totalHistoricalWeight = weighments.filter(w => w.status === 'COMPLETED').reduce((sum, w) => sum + (w.netWeight || 0), 0);

    const lastWeighment = weighments[0] || null;

    res.json({
      vehicle,
      summary: {
        totalWeighments,
        completedWeighments,
        cancelledWeighments,
        todaysLoads,
        todaysTotalWeight,
        totalHistoricalWeight,
        lastWeighmentDate: lastWeighment?.createdAt || null
      }
    });
  } catch (error) {
    console.error('Error fetching vehicle history:', error);
    res.status(500).json({ message: 'Error fetching vehicle history' });
  }
});

export default router;
