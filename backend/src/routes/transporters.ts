import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get all transporters
router.get('/', async (req, res) => {
  try {
    const transporters = await prisma.transporter.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(transporters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transporters' });
  }
});

// Create transporter
router.post('/', async (req, res) => {
  try {
    const { name, mobile, address, gstin } = req.body;
    const transporter = await prisma.transporter.create({
      data: { name, mobile, address, gstin }
    });
    res.status(201).json(transporter);
  } catch (error) {
    res.status(500).json({ message: 'Error creating transporter' });
  }
});

// Update transporter
router.put('/:id', async (req, res) => {
  try {
    const { name, mobile, address, gstin } = req.body;
    const transporter = await prisma.transporter.update({
      where: { id: req.params.id },
      data: { name, mobile, address, gstin }
    });
    res.json(transporter);
  } catch (error) {
    res.status(500).json({ message: 'Error updating transporter' });
  }
});

// Delete transporter
router.delete('/:id', async (req, res) => {
  try {
    await prisma.transporter.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transporter' });
  }
});

export default router;
