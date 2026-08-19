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
    const { vehicleNumber, vehicleType, transporterInfo, state, capacityWeight } = req.body;
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });
    
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber,
        vehicleType: vehicleType || null,
        transporterInfo: transporterInfo || null,
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
    const { vehicleNumber, vehicleType, transporterInfo, state, capacityWeight } = req.body;
    if (!vehicleNumber) return res.status(400).json({ message: "Vehicle number is required." });

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        vehicleNumber,
        vehicleType: vehicleType || null,
        transporterInfo: transporterInfo || null,
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

export default router;
