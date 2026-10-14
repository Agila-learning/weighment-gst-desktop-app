import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

// Search vehicles (case-insensitive, normalized)
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!q) return res.json([]);
    const { includeInactive } = req.query;

    const whereClause: any = {
      vehicleNumber: { contains: q, mode: 'insensitive' }
    };
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      include: { driver: true, transporter: true },
      take: 10,
      orderBy: { vehicleNumber: 'asc' }
    });

    const formatted = vehicles.map(v => ({
      ...v,
      transporterInfo: v.transporter?.name || null
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error searching vehicles' });
  }
});

// Get all vehicles with optional status filter
router.get('/', async (req, res) => {
  try {
    const { status, includeInactive } = req.query;
    let whereClause: any = {};
    if (includeInactive === 'true' || status === 'all') {
      // return both active and inactive
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    } else {
      whereClause.isActive = true;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      include: { driver: true, transporter: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = vehicles.map(v => ({
      ...v,
      transporterInfo: v.transporter?.name || null
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles' });
  }
});

// Create or reactivate vehicle
router.post('/', async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, transporterId, transporterName, state, capacityWeight } = req.body;
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });

    const cleanNumber = vehicleNumber.trim().replace(/\s+/g, '').toUpperCase();
    if (!cleanNumber) return res.status(400).json({ message: "Invalid vehicle number." });

    let finalTransporterId = transporterId || null;
    if (!finalTransporterId && transporterName && typeof transporterName === 'string' && transporterName.trim()) {
      const tName = transporterName.trim();
      let existingTransporter = await prisma.transporter.findFirst({
        where: { name: { equals: tName, mode: 'insensitive' } }
      });
      if (!existingTransporter) {
        existingTransporter = await prisma.transporter.create({
          data: { name: tName }
        });
      }
      finalTransporterId = existingTransporter.id;
    }

    // Check if vehicle with this number already exists
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { vehicleNumber: { equals: cleanNumber, mode: 'insensitive' } }
    });

    if (existingVehicle) {
      if (existingVehicle.isActive) {
        return res.status(400).json({ message: "A vehicle with this number already exists." });
      }

      // Previously soft-deleted vehicle: Reactivate & update with new data
      const updated = await prisma.vehicle.update({
        where: { id: existingVehicle.id },
        data: {
          vehicleNumber: cleanNumber,
          vehicleType: vehicleType || 'Tipper',
          transporterId: finalTransporterId || null,
          state: state || null,
          capacityWeight: capacityWeight ? Number(capacityWeight) : null,
          isActive: true
        },
        include: { driver: true, transporter: true }
      });

      return res.status(200).json({
        ...updated,
        transporterInfo: updated.transporter?.name || null,
        restored: true,
        message: "Vehicle reactivated and updated successfully."
      });
    }

    // Create new vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber: cleanNumber,
        vehicleType: vehicleType || 'Tipper',
        transporterId: finalTransporterId,
        state: state || null,
        capacityWeight: capacityWeight ? Number(capacityWeight) : null,
        isActive: true
      },
      include: { driver: true, transporter: true }
    });

    res.status(201).json({
      ...vehicle,
      transporterInfo: vehicle.transporter?.name || null
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A vehicle with this number already exists." });
    }
    console.error('Error creating vehicle:', error);
    res.status(500).json({ message: 'Error creating vehicle' });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, transporterId, transporterName, state, capacityWeight, isActive } = req.body;
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });

    const cleanNumber = vehicleNumber.trim().replace(/\s+/g, '').toUpperCase();

    // Check if another active vehicle has this number
    const duplicate = await prisma.vehicle.findFirst({
      where: {
        vehicleNumber: { equals: cleanNumber, mode: 'insensitive' },
        id: { not: req.params.id }
      }
    });

    if (duplicate && duplicate.isActive) {
      return res.status(400).json({ message: "A vehicle with this number already exists." });
    }

    let finalTransporterId = transporterId !== undefined ? transporterId : undefined;
    if (!finalTransporterId && transporterName && typeof transporterName === 'string' && transporterName.trim()) {
      const tName = transporterName.trim();
      let existingTransporter = await prisma.transporter.findFirst({
        where: { name: { equals: tName, mode: 'insensitive' } }
      });
      if (!existingTransporter) {
        existingTransporter = await prisma.transporter.create({
          data: { name: tName }
        });
      }
      finalTransporterId = existingTransporter.id;
    }

    const updateData: any = {
      vehicleNumber: cleanNumber,
      vehicleType: vehicleType || null,
      state: state || null,
      capacityWeight: capacityWeight ? Number(capacityWeight) : null
    };

    if (finalTransporterId !== undefined) {
      updateData.transporterId = finalTransporterId || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: updateData,
      include: { driver: true, transporter: true }
    });

    res.json({
      ...vehicle,
      transporterInfo: vehicle.transporter?.name || null
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A vehicle with this number already exists." });
    }
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: 'Error updating vehicle' });
  }
});

// Restore soft-deleted vehicle
router.post('/:id/restore', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { isActive: true },
      include: { driver: true, transporter: true }
    });
    res.json({
      ...vehicle,
      transporterInfo: vehicle.transporter?.name || null,
      message: "Vehicle restored successfully."
    });
  } catch (error) {
    console.error('Error restoring vehicle:', error);
    res.status(500).json({ message: 'Error restoring vehicle' });
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: { 
        invoices: { select: { id: true }, take: 1 },
        weighments: { select: { id: true }, take: 1 },
        permitCards: { select: { id: true }, take: 1 }
      }
    });
    
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    
    const hasRelations = vehicle.invoices.length > 0 || vehicle.weighments.length > 0 || vehicle.permitCards.length > 0;

    if (hasRelations) {
      // Soft delete
      await prisma.vehicle.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });
      return res.status(200).json({ message: 'Vehicle deactivated as it has associated records.', softDeleted: true });
    } else {
      // Hard delete
      await prisma.vehicle.delete({
        where: { id: req.params.id }
      });
      return res.status(200).json({ message: 'Vehicle permanently removed.', softDeleted: false });
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
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
