import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get all payments
router.get('/', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { customer: true, invoice: true },
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

// Get outstanding invoices (where total payments < grandTotal)
router.get('/outstanding', async (req, res) => {
  try {
    // Fetch all finalized invoices and their payments
    const invoices = await prisma.invoice.findMany({
      where: { status: 'FINALIZED', isDeleted: false },
      include: { customer: true, payments: true },
      orderBy: { date: 'asc' }
    });
    
    // Calculate outstanding
    const outstanding = invoices.map(inv => {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = inv.grandTotal - paid;
      return { ...inv, paidAmount: paid, outstandingAmount: balance };
    }).filter(inv => inv.outstandingAmount > 0.01); // Filter out fully paid
    
    res.json(outstanding);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching outstanding invoices' });
  }
});

// Create payment
router.post('/', async (req, res) => {
  try {
    const { customerId, invoiceId, amount, method, reference, date } = req.body;
    
    const payment = await prisma.payment.create({
      data: {
        customerId,
        invoiceId: invoiceId || undefined,
        amount: Number(amount),
        method,
        reference,
        date: date ? new Date(date) : undefined
      }
    });
    
    // Update Ledger
    await prisma.customerTransaction.create({
      data: {
        customerId,
        date: date ? new Date(date) : new Date(),
        type: 'PAYMENT',
        referenceId: payment.id,
        referenceNumber: reference || payment.id.slice(-6),
        debit: 0,
        credit: Number(amount),
        paymentMethod: method
      }
    });
    
    // Optionally update customer balance (not strictly necessary if we calculate on fly, but good practice if using balance field)
    await prisma.customer.update({
      where: { id: customerId },
      data: { balance: { decrement: Number(amount) } }
    });
    
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating payment' });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ message: 'Not found' });
    
    await prisma.payment.delete({ where: { id: req.params.id } });
    
    // Update Ledger (Reverse Payment)
    await prisma.customerTransaction.create({
      data: {
        customerId: payment.customerId,
        date: new Date(),
        type: 'ADJUSTMENT',
        referenceId: payment.id,
        referenceNumber: `DEL-${payment.reference || payment.id.slice(-6)}`,
        debit: payment.amount,
        credit: 0,
        remarks: 'Payment Deleted'
      }
    });

    // Reverse customer balance
    await prisma.customer.update({
      where: { id: payment.customerId },
      data: { balance: { increment: payment.amount } }
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting payment' });
  }
});

export default router;
