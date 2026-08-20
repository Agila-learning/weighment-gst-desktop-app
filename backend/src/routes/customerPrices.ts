import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

// Get all customer specific prices
router.get('/', async (req, res) => {
  try {
    const prices = await prisma.customerMaterialPrice.findMany({
      include: {
        customer: { select: { name: true } },
        material: { select: { name: true, defaultRate: true, unit: true } }
      }
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer prices', error: String(error) });
  }
});
// Get prices by material
router.get('/material/:id', async (req, res) => {
  try {
    const prices = await prisma.customerMaterialPrice.findMany({
      where: { materialId: req.params.id },
      include: { customer: { select: { name: true } } }
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer prices' });
  }
});

// Get prices by customer
router.get('/customer/:id', async (req, res) => {
  try {
    const prices = await prisma.customerMaterialPrice.findMany({
      where: { customerId: req.params.id }
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer prices' });
  }
});
// Set a customer specific price
router.post('/', async (req, res) => {
  try {
    const { customerId, materialId, pricingType, billingUnit, rate, isActive } = req.body;
    
    if (!customerId || !materialId || rate === undefined) {
      return res.status(400).json({ message: "customerId, materialId, and rate are required." });
    }

    const price = await prisma.customerMaterialPrice.upsert({
      where: {
        customerId_materialId: {
          customerId,
          materialId
        }
      },
      update: {
        pricingType: pricingType || 'PER_TON',
        billingUnit: billingUnit || 'TON',
        rate: Number(rate),
        isActive: isActive !== undefined ? isActive : true
      },
      create: {
        customerId,
        materialId,
        pricingType: pricingType || 'PER_TON',
        billingUnit: billingUnit || 'TON',
        rate: Number(rate),
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    res.json(price);
  } catch (error) {
    res.status(500).json({ message: 'Error setting customer price', error: String(error) });
  }
});

// Delete a customer specific price
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customerMaterialPrice.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer price' });
  }
});

export default router;
