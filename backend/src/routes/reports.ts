import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

import * as xlsx from 'xlsx';

router.get('/sales', async (req, res) => {
  console.log('Received request for /api/reports/sales');
  try {
    const invoices = await prisma.invoice.findMany({
      where: { status: 'FINALIZED', isDeleted: false }
    });
    const totalSales = invoices.reduce((acc: number, inv: any) => acc + inv.grandTotal, 0);
    const totalTax = invoices.reduce((acc: number, inv: any) => acc + inv.taxTotal, 0);
    res.json({ totalSales, totalTax, count: invoices.length });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

router.get('/export-sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause: any = { isDeleted: false };
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    const invoices = await prisma.invoice.findMany({ 
      where: whereClause,
      include: { customer: true } 
    });
    const data = invoices.map((i: any) => ({
      InvoiceNumber: i.invoiceNumber,
      Date: i.date,
      Customer: i.customer.name,
      SubTotal: i.subTotal,
      Tax: i.taxTotal,
      GrandTotal: i.grandTotal,
      Status: i.status
    }));
    
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Sales");
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=sales-report.xlsx'
    });
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Error generating excel' });
  }
});

router.get('/material-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let invoiceWhere: any = { status: 'FINALIZED', isDeleted: false };
    
    if (startDate && endDate) {
      invoiceWhere.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    // Fetch all invoice items that belong to finalized invoices within the date range
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: invoiceWhere
      },
      include: {
        material: true
      }
    });
    
    // Aggregate by material
    const materialStats: Record<string, { materialName: string; quantity: number; revenue: number }> = {};
    
    invoiceItems.forEach(item => {
      if (!item.material) return;
      const matId = item.material.id;
      if (!materialStats[matId]) {
        materialStats[matId] = {
          materialName: item.material.name,
          quantity: 0,
          revenue: 0
        };
      }
      materialStats[matId].quantity += item.quantity;
      materialStats[matId].revenue += item.totalAmount;
    });
    
    // Convert to array and sort by revenue descending
    const data = Object.values(materialStats).sort((a, b) => b.revenue - a.revenue);
    
    res.json({ data });
  } catch (error) {
    console.error('Error fetching material analysis:', error);
    res.status(500).json({ message: 'Error fetching material analysis' });
  }
});


router.get('/tax-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let invoiceWhere: any = { status: 'FINALIZED', isDeleted: false };
    
    if (startDate && endDate) {
      invoiceWhere.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        items: true
      }
    });
    
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        totalTaxableValue += item.amount || 0;
        totalCgst += item.cgstAmount || 0;
        totalSgst += item.sgstAmount || 0;
        totalIgst += item.igstAmount || 0;
      });
    });
    
    res.json({
      data: {
        totalTaxableValue,
        totalCgst,
        totalSgst,
        totalIgst,
        totalTax: totalCgst + totalSgst + totalIgst
      }
    });
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    res.status(500).json({ message: 'Error fetching tax summary' });
  }
});

router.get('/outstanding', async (req, res) => {
  try {
    const outstandingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'FINALIZED',
        isDeleted: false,
        paymentStatus: {
          in: ['UNPAID', 'PARTIAL']
        }
      },
      include: {
        customer: true
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Group by customer
    const customerBalances: Record<string, any> = {};
    
    outstandingInvoices.forEach(inv => {
      const custId = inv.customerId;
      if (!customerBalances[custId]) {
        customerBalances[custId] = {
          customerId: custId,
          customerName: inv.customer.name,
          customerPhone: inv.customer.phone || inv.customer.mobile1,
          totalOutstanding: 0,
          invoices: []
        };
      }
      
      const due = inv.balance || 0; // fallback to grandTotal if balance not set correctly? actually balance is reliable
      customerBalances[custId].totalOutstanding += due;
      customerBalances[custId].invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        grandTotal: inv.grandTotal,
        balance: inv.balance,
        paymentStatus: inv.paymentStatus
      });
    });
    
    const data = Object.values(customerBalances).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    
    res.json({ data });
  } catch (error) {
    console.error('Error fetching outstanding:', error);
    res.status(500).json({ message: 'Error fetching outstanding' });
  }
});

export default router;

