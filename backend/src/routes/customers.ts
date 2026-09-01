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
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Error fetching customers', error: String(error), details: error?.message });
  }
});

// Get vehicles for customer
router.get('/:id/vehicles', async (req, res) => {
  try {
    // Get vehicles explicitly linked to customer
    const linkedVehicles = await prisma.vehicle.findMany({
      where: { customerId: req.params.id, isActive: true }
    });

    // Get vehicles used in previous invoices by this customer
    const invoiceVehicles = await prisma.invoice.findMany({
      where: { customerId: req.params.id, vehicleId: { not: null } },
      select: { vehicle: true },
      distinct: ['vehicleId']
    });

    // Combine and deduplicate
    const allVehicles = [...linkedVehicles];
    for (const inv of invoiceVehicles) {
      if (inv.vehicle && inv.vehicle.isActive && !allVehicles.some(v => v.id === inv.vehicle?.id)) {
        allVehicles.push(inv.vehicle);
      }
    }

    res.json(allVehicles);
  } catch (error) {
    console.error('Error fetching customer vehicles:', error);
    res.status(500).json({ message: 'Error fetching vehicles' });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, gstin, phone, email, address, stateName, stateCode, mobile1, mobile2, vehicleNumber } = req.body;
    
    // Server-side validation
    if (!name || name.length < 3) return res.status(400).json({ message: "Name must be at least 3 characters long." });
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) return res.status(400).json({ message: "Invalid GSTIN format." });
    if (phone && !/^(\+91[\s-]?)?\d{10}$/.test(phone)) return res.status(400).json({ message: "Mobile number must be exactly 10 digits (optionally prefixed with +91)." });
    if (mobile1 && !/^(\+91[\s-]?)?\d{10}$/.test(mobile1)) return res.status(400).json({ message: "Mobile 1 must be exactly 10 digits." });
    if (mobile2 && !/^(\+91[\s-]?)?\d{10}$/.test(mobile2)) return res.status(400).json({ message: "Mobile 2 must be exactly 10 digits." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Invalid Email address." });
    if (address && address.length < 5) return res.status(400).json({ message: "Address must be at least 5 characters long." });

    const customer = await prisma.customer.create({
      data: {
        name,
        gstin: gstin || null,
        phone: phone || null,
        email: email || null,
        mobile1: mobile1 || null,
        mobile2: mobile2 || null,
        address: address || null,
        stateName: stateName || null,
        stateCode: stateCode || null
      }
    });

    if (vehicleNumber) {
      const formattedVehicle = vehicleNumber.trim().toUpperCase();
      try {
        await prisma.vehicle.upsert({
          where: { vehicleNumber: formattedVehicle },
          update: { customerId: customer.id },
          create: { vehicleNumber: formattedVehicle, customerId: customer.id }
        });
      } catch (err) {
        console.error('Failed to link vehicle to new customer', err);
      }
    }

    res.status(201).json(customer);
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'record';
      return res.status(400).json({ message: `A customer with this ${field} already exists.` });
    }
    res.status(500).json({ message: 'Error creating customer', error: String(error), details: error?.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, gstin, phone, email, address, stateName, stateCode, mobile1, mobile2 } = req.body;
    
    // Server-side validation
    if (!name || name.length < 3) return res.status(400).json({ message: "Name must be at least 3 characters long." });
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) return res.status(400).json({ message: "Invalid GSTIN format." });
    if (phone && !/^(\+91[\s-]?)?\d{10}$/.test(phone)) return res.status(400).json({ message: "Mobile number must be exactly 10 digits (optionally prefixed with +91)." });
    if (mobile1 && !/^(\+91[\s-]?)?\d{10}$/.test(mobile1)) return res.status(400).json({ message: "Mobile 1 must be exactly 10 digits." });
    if (mobile2 && !/^(\+91[\s-]?)?\d{10}$/.test(mobile2)) return res.status(400).json({ message: "Mobile 2 must be exactly 10 digits." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Invalid Email address." });
    if (address && address.length < 5) return res.status(400).json({ message: "Address must be at least 5 characters long." });

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        gstin: gstin || null,
        phone: phone || null,
        email: email || null,
        mobile1: mobile1 || null,
        mobile2: mobile2 || null,
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

// Get Ledger Summary & Transactions
router.get('/:id/ledger', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { fromDate, toDate, type, referenceNumber } = req.query;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    let whereClause: any = { customerId };

    if (fromDate || toDate) {
      whereClause.date = {};
      if (fromDate) whereClause.date.gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        whereClause.date.lte = to;
      }
    }
    if (type) whereClause.type = type;
    if (referenceNumber) whereClause.referenceNumber = { contains: referenceNumber as string, mode: 'insensitive' };

    const transactions = await prisma.customerTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Summary calculation
    const allTx = await prisma.customerTransaction.findMany({ where: { customerId }});
    const totalSales = allTx.filter(tx => tx.type === 'INVOICE').reduce((sum, tx) => sum + tx.debit, 0);
    const totalPaid = allTx.filter(tx => tx.type === 'PAYMENT').reduce((sum, tx) => sum + tx.credit, 0);
    const outstanding = totalSales - totalPaid;
    
    const numInvoices = await prisma.invoice.count({ where: { customerId, status: 'FINALIZED', isDeleted: false } });

    res.json({
      summary: {
        totalSales,
        totalPaid,
        outstandingAmount: outstanding, // We can also use customer.balance which should be synced
        numInvoices
      },
      transactions
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ message: 'Error fetching ledger' });
  }
});

// Get Customer Weighments
router.get('/:id/weighments', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { fromDate, toDate, materialId, vehicleId, status, page, limit } = req.query;

    const take = limit ? Number(limit) : 25;
    const skip = page ? (Number(page) - 1) * take : 0;

    let whereClause: any = { customerId };

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }
    if (materialId) whereClause.materialId = materialId;
    if (vehicleId) whereClause.vehicleId = vehicleId;
    if (status) whereClause.status = status;

    const [weighments, total] = await Promise.all([
      prisma.weighment.findMany({
        where: whereClause,
        include: {
          vehicle: true,
          material: true,
          driver: true,
          transporter: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.weighment.count({ where: whereClause })
    ]);

    res.json({
      data: weighments,
      meta: {
        total,
        page: page ? Number(page) : 1,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Error fetching customer weighments:', error);
    res.status(500).json({ message: 'Error fetching weighments' });
  }
});

export default router;
