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

export default router;
