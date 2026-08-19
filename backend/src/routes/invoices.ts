import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const router = Router();

router.use(authenticate);

// Get all invoices with pagination, filtering, searching
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, status, startDate, endDate, customerId, vehicleId, materialId } = req.query;
    
    const take = limit ? Number(limit) : 25;
    const skip = page ? (Number(page) - 1) * take : 0;
    
    const where: any = { isDeleted: false };
    
    if (status) where.status = status;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (materialId) {
      where.items = { some: { materialId } };
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
        { vehicle: { vehicleNumber: { contains: search as string, mode: 'insensitive' } } }
      ];
    }
    
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: true, vehicle: true, items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.invoice.count({ where })
    ]);
    
    res.json({
      data: invoices,
      meta: {
        total,
        page: page ? Number(page) : 1,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoices' });
  }
});

// Helper for calculating invoice totals and formatting items
const prepareInvoiceData = async (items: any[]) => {
  let subTotal = 0;
  let taxTotal = 0;
  const invoiceItems = [];
  
  for (const item of items) {
    const material = await prisma.material.findUnique({ 
      where: { id: item.materialId },
      include: { taxRate: true }
    });
    if (!material) continue;
    
    const amount = item.quantity * item.rate;
    const cgstRate = item.cgstRate !== undefined ? item.cgstRate : (material.taxRate?.cgst || 0);
    const sgstRate = item.sgstRate !== undefined ? item.sgstRate : (material.taxRate?.sgst || 0);
    const igstRate = item.igstRate !== undefined ? item.igstRate : (material.taxRate?.igst || 0);
    
    const cgstAmount = (amount * cgstRate) / 100;
    const sgstAmount = (amount * sgstRate) / 100;
    const igstAmount = (amount * igstRate) / 100;
    const taxAmount = cgstAmount + sgstAmount + igstAmount;
    
    subTotal += amount;
    taxTotal += taxAmount;
    
    invoiceItems.push({
      materialId: item.materialId,
      materialName: item.materialName || material.name,
      hsnCode: item.hsnCode || material.hsnCode,
      unit: item.unit || material.unit,
      cgstRate, sgstRate, igstRate,
      cgstAmount, sgstAmount, igstAmount,
      quantity: item.quantity,
      rate: item.rate,
      amount,
      taxAmount,
      totalAmount: amount + taxAmount
    });
  }
  return { invoiceItems, subTotal, taxTotal, grandTotal: subTotal + taxTotal };
};

// Create Invoice
router.post('/', async (req, res) => {
  try {
    const { 
      customerId, vehicleId, items, status, date,
      buyerName, buyerAddress, buyerGstin, buyerState, buyerStateCode,
      consigneeName, consigneeAddress, consigneeGstin, consigneeState, consigneeStateCode,
      deliveryNote, paymentTerms, referenceNo, referenceDate, buyersOrderNo, buyersOrderDate,
      dispatchDocNo, dispatchDocDate, dispatchedThrough, destination, billOfLading,
      snapshotVehicleNumber, termsOfDelivery, weighmentReference
    } = req.body;
    
    const { invoiceItems, subTotal, taxTotal, grandTotal } = await prepareInvoiceData(items);
    
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        vehicleId,
        date: date ? new Date(date) : new Date(),
        buyerName, buyerAddress, buyerGstin, buyerState, buyerStateCode,
        consigneeName, consigneeAddress, consigneeGstin, consigneeState, consigneeStateCode,
        deliveryNote, paymentTerms, referenceNo, referenceDate, buyersOrderNo, buyersOrderDate,
        dispatchDocNo, dispatchDocDate, dispatchedThrough, destination, billOfLading,
        snapshotVehicleNumber, termsOfDelivery, weighmentReference,
        subTotal, taxTotal, grandTotal,
        status: status || 'DRAFT',
        items: { create: invoiceItems }
      },
      include: { items: true, customer: true }
    });
    
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error creating invoice' });
  }
});

// Update Invoice
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Invoice not found' });
    if (existing.status === 'CANCELLED') return res.status(400).json({ message: 'Cannot edit cancelled invoice' });

    const { 
      customerId, vehicleId, items, status, date,
      buyerName, buyerAddress, buyerGstin, buyerState, buyerStateCode,
      consigneeName, consigneeAddress, consigneeGstin, consigneeState, consigneeStateCode,
      deliveryNote, paymentTerms, referenceNo, referenceDate, buyersOrderNo, buyersOrderDate,
      dispatchDocNo, dispatchDocDate, dispatchedThrough, destination, billOfLading,
      snapshotVehicleNumber, termsOfDelivery, weighmentReference
    } = req.body;
    
    const { invoiceItems, subTotal, taxTotal, grandTotal } = await prepareInvoiceData(items);

    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } }),
      prisma.invoice.update({
        where: { id: req.params.id },
        data: {
          customerId, vehicleId,
          date: date ? new Date(date) : undefined,
          buyerName, buyerAddress, buyerGstin, buyerState, buyerStateCode,
          consigneeName, consigneeAddress, consigneeGstin, consigneeState, consigneeStateCode,
          deliveryNote, paymentTerms, referenceNo, referenceDate, buyersOrderNo, buyersOrderDate,
          dispatchDocNo, dispatchDocDate, dispatchedThrough, destination, billOfLading,
          snapshotVehicleNumber, termsOfDelivery, weighmentReference,
          subTotal, taxTotal, grandTotal,
          status: status || existing.status,
          items: { create: invoiceItems }
        }
      })
    ]);
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true, customer: true }
    });
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error updating invoice' });
  }
});

// Cancel Invoice
router.put('/:id/cancel', async (req, res) => {
  try {
    const { cancelReason } = req.body;
    if (!cancelReason) return res.status(400).json({ message: 'Cancel reason is required' });
    
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancelReason }
    });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling invoice' });
  }
});

// Delete Draft Invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft invoices can be deleted' });
    
    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { isDeleted: true }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting invoice' });
  }
});

// Download PDF Invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateInvoicePDF(req.params.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=invoice-${req.params.id}.pdf`
    });
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

export default router;
