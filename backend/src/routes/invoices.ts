import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { Parser } from 'json2csv';
import { getBrowser } from '../utils/browserManager';

const router = Router();

router.use(authenticate);

// Get all invoices with pagination, filtering, searching
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, status, startDate, endDate, customerId, vehicleId, materialId, paymentStatus, invoiceType } = req.query;
    
    const take = limit ? Number(limit) : 25;
    const skip = page ? (Number(page) - 1) * take : 0;
    
    const where: any = { isDeleted: false };
    
    if (invoiceType) where.invoiceType = invoiceType;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
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
        include: { customer: true, vehicle: { include: { driver: true } }, items: { include: { material: true } } },
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
      totalAmount: amount + taxAmount,
      pricingType: item.pricingType || null,
      quantityUnit: item.quantityUnit || null,
      quantitySource: item.quantitySource || 'MANUAL',
      weighmentReference: item.weighmentReference || null
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
      snapshotVehicleNumber, termsOfDelivery, weighmentReference,
      invoiceType, manualInvoiceNumber
    } = req.body;
    
    const { invoiceItems, subTotal, taxTotal, grandTotal } = await prepareInvoiceData(items);
    
    let invoiceNumber = manualInvoiceNumber;
    let settings = await prisma.companySetting.findFirst();
    const prefix = settings?.invoicePrefix || 'INV-';
    const year = new Date().getFullYear();

    if (invoiceType === 'E_INVOICE' && manualInvoiceNumber) {
      // E-Invoice uses manual reference exactly as provided, does not update sequence
      invoiceNumber = manualInvoiceNumber;
    } else {
      if (manualInvoiceNumber) {
        // If user provided a manual number, use it, but check for dupes.
        const parsed = parseInt(manualInvoiceNumber, 10);
        if (!isNaN(parsed)) {
           // Update sequence to match this manual number if it's higher
           if (settings && parsed > settings.currentInvoiceSequence) {
             await prisma.companySetting.update({ where: { id: settings.id }, data: { currentInvoiceSequence: parsed } });
           }
        }
        invoiceNumber = `${prefix}${year}-${manualInvoiceNumber}`;
      } else {
        // Auto-generate based on sequence
        let nextSeq = (settings?.currentInvoiceSequence || 0) + 1;
        if (settings) {
          await prisma.companySetting.update({ where: { id: settings.id }, data: { currentInvoiceSequence: nextSeq } });
        }
        invoiceNumber = `${prefix}${year}-${String(nextSeq).padStart(4, '0')}`;
      }
    }

    // Prevent duplicates
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    if (existing) return res.status(400).json({ message: `Invoice number ${invoiceNumber} already exists!` });

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: invoiceType || 'STANDARD',
        manualInvoiceNumber,
        customerId,
        vehicleId,
        date: date ? new Date(date) : new Date(),
        buyerName, buyerAddress, buyerGstin, buyerState, buyerStateCode,
        consigneeName, consigneeAddress, consigneeGstin, consigneeState, consigneeStateCode,
        deliveryNote, paymentTerms, referenceNo, referenceDate, buyersOrderNo, buyersOrderDate,
        dispatchDocNo, dispatchDocDate, dispatchedThrough, destination, billOfLading,
        snapshotVehicleNumber, termsOfDelivery, weighmentReference,
        subTotal, taxTotal, grandTotal,
        balance: grandTotal,
        paymentStatus: 'UNPAID',
        status: status || 'DRAFT',
        items: { create: invoiceItems }
      },
      include: { items: true, customer: true }
    });
    
    if (invoice.status === 'FINALIZED') {
      await prisma.customerTransaction.create({
        data: {
          customerId: invoice.customerId,
          date: invoice.date,
          type: 'INVOICE',
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          debit: invoice.grandTotal,
          credit: 0
        }
      });
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { increment: invoice.grandTotal } }
      });
    }

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
    if (existing.status === 'FINALIZED') return res.status(400).json({ message: 'Cannot edit finalized invoice. Please cancel it instead.' });

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
          balance: grandTotal - (existing.amountPaid || 0),
          paymentStatus: (existing.amountPaid || 0) >= grandTotal ? 'PAID' : (existing.amountPaid || 0) > 0 ? 'PARTIAL' : 'UNPAID',
          status: status || existing.status,
          items: { create: invoiceItems }
        }
      })
    ]);
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true, customer: true }
    });
    
    if (existing.status !== 'FINALIZED' && invoice?.status === 'FINALIZED') {
      await prisma.customerTransaction.create({
        data: {
          customerId: invoice.customerId,
          date: invoice.date,
          type: 'INVOICE',
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          debit: invoice.grandTotal,
          credit: 0
        }
      });
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { increment: invoice.grandTotal } }
      });
    }
    
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
    
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancelReason, balance: 0 }
    });
    
    if (existing?.status === 'FINALIZED') {
      await prisma.customerTransaction.create({
        data: {
          customerId: invoice.customerId,
          date: new Date(),
          type: 'ADJUSTMENT',
          referenceId: invoice.id,
          referenceNumber: `CAN-${invoice.invoiceNumber}`,
          debit: 0,
          credit: invoice.grandTotal,
          remarks: 'Invoice Cancelled'
        }
      });
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { balance: { decrement: invoice.grandTotal } }
      });
    }
    
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
    
    await prisma.$transaction(async (tx) => {
      if (invoice.status === 'FINALIZED') {
        await tx.customerTransaction.deleteMany({ where: { referenceId: invoice.id, type: 'INVOICE' } });
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { balance: { decrement: invoice.grandTotal } }
        });
      }
      await tx.invoice.update({
        where: { id: req.params.id },
        data: { isDeleted: true }
      });
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting invoice' });
  }
});

// Download actual PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const htmlContent = await generateInvoicePDF(req.params.id);
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    
    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '5mm', bottom: '5mm', left: '5mm', right: '5mm' } });
      await page.close();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice?.invoiceNumber || req.params.id}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (pdfErr) {
      console.warn('Puppeteer PDF generation failed, falling back to HTML', pdfErr);
      res.set({
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="Invoice-${invoice?.invoiceNumber || req.params.id}.html"`
      });
      res.send(htmlContent);
    }
  } catch (error: any) {
    console.error('PDF GENERATION ERROR:', error);
    res.status(500).json({ message: 'Error generating PDF: ' + (error.message || String(error)) });
  }
});

export default router;
