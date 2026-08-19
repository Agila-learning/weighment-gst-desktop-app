import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';
import * as xlsx from 'xlsx';

const router = Router();
router.use(authenticate);

// Export Weighments to Excel
router.get('/excel', async (req, res) => {
  try {
    const { vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId, status, fromDate, toDate, weightSource } = req.query;

    const where: any = {};

    if (vehicleNumber) where.vehicleNumber = { contains: vehicleNumber as string, mode: 'insensitive' };
    if (slipNumber) where.slipNumber = { contains: slipNumber as string, mode: 'insensitive' };
    if (customerId) where.customerId = customerId;
    if (materialId) where.materialId = materialId;
    if (driverId) where.driverId = driverId;
    if (transporterId) where.transporterId = transporterId;
    
    if (status) {
      if (status === 'PENDING') {
        where.status = 'WAITING_FOR_SECOND_WEIGHT';
      } else {
        where.status = status;
      }
    }

    if (weightSource) {
      where.OR = [
        { firstWeightSource: weightSource },
        { secondWeightSource: weightSource }
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) {
        const to = new Date(toDate as string);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const weighments = await prisma.weighment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
        customer: true,
        material: true,
        driver: true,
        transporter: true,
        operator: { select: { name: true } }
      }
    });

    const exportData = weighments.map(w => ({
      'Slip Number': w.slipNumber || '-',
      'Date': w.createdAt.toLocaleDateString(),
      'Time': w.createdAt.toLocaleTimeString(),
      'Vehicle Number': w.vehicleNumber,
      'Customer': w.customer?.name || '-',
      'Material': w.material?.name || '-',
      'Driver': w.driver?.name || '-',
      'Transporter': w.transporter?.name || '-',
      'First Weight (KG)': w.firstWeight || '-',
      'Second Weight (KG)': w.secondWeight || '-',
      'Net Weight (KG)': w.netWeight || '-',
      'Unit': w.unit,
      'Weight Source': w.secondWeightSource || w.firstWeightSource || '-',
      'Status': w.status,
      'Operator': w.operator?.name || '-',
      'Cancelled By': w.cancelledBy || '-',
      'Cancellation Reason': w.cancellationReason || '-'
    }));

    // Create workbook
    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Weighments");

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers and send
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Weighments_Export.xlsx"');
    res.send(buffer);

    // @ts-ignore
    const user = req.user;
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'EXPORT_EXCEL',
          entity: 'Weighment',
          details: `Exported ${weighments.length} weighments to Excel.`
        }
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating Excel export' });
  }
});

export default router;
