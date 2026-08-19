import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Error fetching customers', error: String(error) });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, gstin, phone, email, address, stateName, stateCode } = req.body;
    
    // Server-side validation
    if (!name || name.length < 3) return res.status(400).json({ message: "Name must be at least 3 characters long." });
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) return res.status(400).json({ message: "Invalid GSTIN format." });
    if (phone && !/^(\+91[\s-]?)?\d{10}$/.test(phone)) return res.status(400).json({ message: "Mobile number must be exactly 10 digits (optionally prefixed with +91)." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Invalid Email address." });
    if (address && address.length < 5) return res.status(400).json({ message: "Address must be at least 5 characters long." });

    const customer = await prisma.customer.create({
      data: {
        name,
        gstin: gstin || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        stateName: stateName || null,
        stateCode: stateCode || null
      }
    });
    res.status(201).json(customer);
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'record';
      return res.status(400).json({ message: `A customer with this ${field} already exists.` });
    }
    res.status(500).json({ message: 'Error creating customer' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, gstin, phone, email, address, stateName, stateCode } = req.body;
    
    // Server-side validation
    if (!name || name.length < 3) return res.status(400).json({ message: "Name must be at least 3 characters long." });
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) return res.status(400).json({ message: "Invalid GSTIN format." });
    if (phone && !/^(\+91[\s-]?)?\d{10}$/.test(phone)) return res.status(400).json({ message: "Mobile number must be exactly 10 digits (optionally prefixed with +91)." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Invalid Email address." });
    if (address && address.length < 5) return res.status(400).json({ message: "Address must be at least 5 characters long." });

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        gstin: gstin || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        stateName: stateName || null,
        stateCode: stateCode || null
      }
    });
    res.json(customer);
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'record';
      return res.status(400).json({ message: `A customer with this ${field} already exists.` });
    }
    res.status(500).json({ message: 'Error updating customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { invoices: true }
    });
    
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    if (customer.invoices.length > 0) {
      // Soft delete
      await prisma.customer.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });
    } else {
      // Hard delete
      await prisma.customer.delete({
        where: { id: req.params.id }
      });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer' });
  }
});

// Get customer summary
router.get('/:id/summary', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { customerId: req.params.id, status: 'FINALIZED' },
      orderBy: { date: 'desc' }
    });
    
    const summary = {
      totalInvoices: invoices.length,
      totalBilling: invoices.reduce((sum: number, inv: any) => sum + inv.grandTotal, 0),
      totalPaid: invoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid || 0), 0),
      outstanding: invoices.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0),
      lastInvoiceDate: invoices.length > 0 ? invoices[0].date : null
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching customer summary:', error);
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

export default router;
