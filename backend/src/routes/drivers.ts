import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers' });
  }
});

// Create driver
router.post('/', async (req, res) => {
  try {
    const { name, mobile, licenseNumber, licenseExpiry, address, transporterName } = req.body;
    const driver = await prisma.driver.create({
      data: { name, mobile, licenseNumber, licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined, address, transporterName }
    });
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error creating driver' });
  }
});

// Update driver
router.put('/:id', async (req, res) => {
  try {
    const { name, mobile, licenseNumber, licenseExpiry, address, transporterName } = req.body;
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: { name, mobile, licenseNumber, licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined, address, transporterName }
    });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error updating driver' });
  }
});

// Delete driver
router.delete('/:id', async (req, res) => {
  try {
    await prisma.driver.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting driver' });
  }
});

export default router;
