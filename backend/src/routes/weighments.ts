import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get all weighments (History) with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const { vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId, status, fromDate, toDate, weightSource } = req.query;

    const where: any = {};

    if (vehicleNumber) where.vehicleNumber = { contains: vehicleNumber as string, mode: 'insensitive' };
    if (slipNumber) where.slipNumber = { contains: slipNumber as string, mode: 'insensitive' };
    if (customerId) where.customerId = customerId;
    if (materialId) where.materialId = materialId;
    if (driverId) where.driverId = driverId;
    if (transporterId) where.transporterId = transporterId;
    
    if (status) {
      if (status === 'PENDING') {
        where.status = 'WAITING_FOR_SECOND_WEIGHT';
      } else {
        where.status = status;
      }
    }

    if (weightSource) {
      where.OR = [
        { firstWeightSource: weightSource },
        { secondWeightSource: weightSource }
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [weighments, total] = await Promise.all([
      prisma.weighment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: true,
          customer: true,
          material: true,
          driver: true,
          transporter: true,
          operator: { select: { id: true, name: true } }
        }
      }),
      prisma.weighment.count({ where })
    ]);

    res.json({
      data: weighments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weighments' });
  }
});

// Cancel a weighment
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Cancellation reason is required" });

    // @ts-ignore
    const user = req.user;

    const weighment = await prisma.weighment.findUnique({ where: { id: req.params.id } });
    if (!weighment) return res.status(404).json({ message: "Weighment not found" });

    if (weighment.status === 'CANCELLED') {
      return res.status(400).json({ message: "Weighment is already cancelled" });
    }

    // Must be admin or authorized user (enforce role check here in real app)
    if (user.role === 'STAFF') {
       return res.status(403).json({ message: "Not authorized to cancel weighments." });
    }

    const updated = await prisma.weighment.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledBy: user.name || user.id,
        cancelledAt: new Date()
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CANCEL_WEIGHMENT',
        entity: 'Weighment',
        entityId: weighment.id,
        details: `Cancelled weighment ${weighment.slipNumber || weighment.id}. Reason: ${reason}`
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling weighment' });
  }
});

// Create First Weight
router.post('/first-weight', async (req, res) => {
  try {
    const { vehicleId, vehicleNumber, customerId, materialId, driverId, transporterId, firstWeight, unit, firstWeightSource } = req.body;
    
    // Check for open weighment
    const whereClause: any = { status: { in: ['OPEN', 'FIRST_WEIGHT_RECORDED', 'WAITING_FOR_SECOND_WEIGHT'] } };
    if (vehicleId) whereClause.vehicleId = vehicleId;
    else if (vehicleNumber) whereClause.vehicleNumber = vehicleNumber;
    else return res.status(400).json({ message: 'Vehicle ID or Number is required.' });

    const existingOpen = await prisma.weighment.findFirst({
      where: whereClause
    });

    if (existingOpen) {
      return res.status(400).json({ message: 'This vehicle already has an open weighment.' });
    }

    const weighment = await prisma.weighment.create({
      data: {
        vehicleId,
        vehicleNumber,
        customerId,
        materialId,
        driverId,
        transporterId,
        firstWeight,
        firstWeightDate: new Date(),
        unit: unit || 'KG',
        status: 'WAITING_FOR_SECOND_WEIGHT',
        firstWeightSource: firstWeightSource || 'MANUAL',
        // @ts-ignore - Assuming req.user exists from authenticate middleware
        operatorId: req.user?.id
      }
    });
    res.status(201).json(weighment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating first weight' });
  }
});

// Update Second Weight and Complete
router.post('/second-weight', async (req, res) => {
  try {
    const { vehicleId, secondWeight, secondWeightSource } = req.body;
    
    // Find open weighment
    const openWeighment = await prisma.weighment.findFirst({
      where: { vehicleId, status: { in: ['OPEN', 'FIRST_WEIGHT_RECORDED', 'WAITING_FOR_SECOND_WEIGHT'] } }
    });

    if (!openWeighment) {
      return res.status(404).json({ message: 'No open weighment found for this vehicle.' });
    }
    
    if (openWeighment.firstWeight == null) {
      return res.status(400).json({ message: 'First weight is not recorded yet.' });
    }

    if (Number(secondWeight) === Number(openWeighment.firstWeight)) {
      return res.status(400).json({ message: 'Second weight cannot be identical to the first weight.' });
    }
    
    if (Number(secondWeight) <= 0) {
      return res.status(400).json({ message: 'Second weight must be greater than zero.' });
    }

    const netWeight = Math.abs(Number(secondWeight) - Number(openWeighment.firstWeight));

    // Generate slip number
    const count = await prisma.weighment.count({ where: { status: 'COMPLETED' } });
    const slipNumber = `WS-${1000 + count + 1}`;

    const weighment = await prisma.weighment.update({
      where: { id: openWeighment.id },
      data: {
        secondWeight,
        secondWeightDate: new Date(),
        secondWeightSource: secondWeightSource || 'MANUAL',
        netWeight,
        slipNumber,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
    res.status(200).json(weighment);
  } catch (error) {
    res.status(500).json({ message: 'Error recording second weight' });
  }
});

// Get pending weighments
router.get('/pending', async (req, res) => {
  try {
    const weighments = await prisma.weighment.findMany({
      where: { status: 'WAITING_FOR_SECOND_WEIGHT' },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
        customer: true,
        material: true,
        driver: true,
        transporter: true
      }
    });
    res.json(weighments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending weighments' });
  }
});

// Get active weighment for a vehicle
router.get('/active/:vehicleId', async (req, res) => {
  try {
    const weighment = await prisma.weighment.findFirst({
      where: { vehicleId: req.params.vehicleId, status: { in: ['OPEN', 'FIRST_WEIGHT_RECORDED', 'WAITING_FOR_SECOND_WEIGHT'] } },
      include: {
        vehicle: true,
        customer: true,
        material: true,
        driver: true,
        transporter: true
      }
    });
    
    if (!weighment) {
      return res.status(404).json({ message: 'No active weighment found' });
    }
    
    res.json(weighment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active weighment' });
  }
});

// Sync Offline Weighments
router.post('/', async (req, res) => {
  try {
    const { 
      id, vehicleId, vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId, 
      firstWeight, secondWeight, netWeight, status, date,
      pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount, pricingSnapshot
    } = req.body;

    const weighment = await prisma.weighment.upsert({
      where: { id: id || '' }, // if no id, it will fail and fallback to create, or use slipNumber
      update: {
        vehicleId, vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId,
        firstWeight, secondWeight, netWeight, status,
        pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount, pricingSnapshot
      },
      create: {
        id,
        vehicleId, vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId,
        firstWeight, secondWeight, netWeight, status,
        createdAt: new Date(date || new Date()),
        pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount, pricingSnapshot
      }
    });

    res.status(200).json(weighment);
  } catch (error: any) {
    // If upsert by ID fails, fallback to slipNumber for uniqueness
    if (error.code === 'P2025' || error.code === 'P2002') {
       try {
         const weighment = await prisma.weighment.upsert({
           where: { slipNumber: req.body.slipNumber },
           update: req.body,
           create: { ...req.body, createdAt: new Date(req.body.date || new Date()) }
         });
         return res.status(200).json(weighment);
       } catch (fallbackError) {
         return res.status(500).json({ message: 'Error syncing weighment' });
       }
    }
    res.status(500).json({ message: 'Error syncing weighment' });
  }
});

export default router;
