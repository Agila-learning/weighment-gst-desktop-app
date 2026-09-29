import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

// Get all materials
router.get('/', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      include: { taxRate: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching materials' });
  }
});

// Create material
router.post('/', async (req, res) => {
  try {
    const { name, category, subCategory, hsnCode, defaultRate, unit, gstRateId, pricingType, billingUnit } = req.body;
    if (!name) return res.status(400).json({ message: "Material name is required." });

    const material = await prisma.material.create({
      data: {
        name,
        category: category || null,
        subCategory: subCategory || null,
        hsnCode: hsnCode || null,
        unit: unit || 'TON',
        pricingType: pricingType || 'PER_TON',
        billingUnit: billingUnit || 'TON',
        defaultRate: Number(defaultRate),
        gstRateId: gstRateId || null
      }
    });
    res.status(201).json(material);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A material with this name already exists." });
    }
    console.error('Error creating material:', error);
    res.status(500).json({ message: 'Error creating material' });
  }
});

// Update material
router.put('/:id', async (req, res) => {
  try {
    const { name, category, subCategory, hsnCode, defaultRate, unit, gstRateId, pricingType, billingUnit } = req.body;
    if (!name) return res.status(400).json({ message: "Material name is required." });
    
    const material = await prisma.material.update({
      where: { id: req.params.id },
      data: {
        name,
        category: category || null,
        subCategory: subCategory || null,
        hsnCode: hsnCode || null,
        unit: unit || 'TON',
        pricingType: pricingType || 'PER_TON',
        billingUnit: billingUnit || 'TON',
        defaultRate: Number(defaultRate),
        gstRateId: gstRateId || null
      }
    });
    res.json(material);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "A material with this name already exists." });
    }
    res.status(500).json({ message: 'Error updating material' });
  }
});

// Delete material
router.delete('/:id', async (req, res) => {
  try {
    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: { invoiceItems: true }
    });
    
    if (!material) return res.status(404).json({ message: 'Material not found' });
    
    if (material.invoiceItems.length > 0) {
      // Soft delete
      await prisma.material.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });
    } else {
      // Hard delete
      await prisma.material.delete({
        where: { id: req.params.id }
      });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting material' });
  }
});

export default router;
