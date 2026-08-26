import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get all weighments (History) with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const { vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId, status, fromDate, toDate, weightSource, search } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { vehicleNumber: { contains: search as string, mode: 'insensitive' } },
        { slipNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } },
        { materialName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

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

    const [weighments, total] = await Promise.all([
      prisma.weighment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: true,
          customer: true,
          material: true,
          driver: true,
          transporter: true,
          operator: { select: { id: true, name: true } }
        }
      }),
      prisma.weighment.count({ where })
    ]);

    res.json({
      data: weighments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weighments' });
  }
});

// Cancel a weighment
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Cancellation reason is required" });

    // @ts-ignore
    const user = req.user;

    const weighment = await prisma.weighment.findUnique({ where: { id: req.params.id } });
    if (!weighment) return res.status(404).json({ message: "Weighment not found" });

    if (weighment.status === 'CANCELLED') {
      return res.status(400).json({ message: "Weighment is already cancelled" });
    }

    const updated = await prisma.weighment.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledBy: user.name || user.id,
        cancelledAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CANCEL_WEIGHMENT',
        entity: 'Weighment',
        entityId: weighment.id,
        details: `Cancelled weighment ${weighment.slipNumber || weighment.id}. Reason: ${reason}`
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling weighment' });
  }
});

// Request correction for a weighment
router.post('/:id/correct', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Correction reason is required" });

    // @ts-ignore
    const user = req.user;

    const weighment = await prisma.weighment.findUnique({ where: { id: req.params.id } });
    if (!weighment) return res.status(404).json({ message: "Weighment not found" });

    // Mark original as CORRECTED
    await prisma.weighment.update({
      where: { id: req.params.id },
      data: {
        status: 'CORRECTED',
        cancellationReason: reason,
        cancelledBy: user.name || user.id,
        cancelledAt: new Date()
      }
    });

    // Duplicate the record as a correction
    const newWeighment = await prisma.weighment.create({
      data: {
        slipNumber: weighment.slipNumber ? `${weighment.slipNumber}-C` : undefined,
        vehicleId: weighment.vehicleId,
        vehicleNumber: weighment.vehicleNumber,
        customerId: weighment.customerId,
        materialId: weighment.materialId,
        driverId: weighment.driverId,
        transporterId: weighment.transporterId,
        firstWeight: weighment.firstWeight,
        secondWeight: weighment.secondWeight,
        netWeight: weighment.netWeight,
        createdAt: weighment.createdAt,
        loadType: weighment.loadType,
        firstWeightDate: weighment.firstWeightDate,
        secondWeightDate: weighment.secondWeightDate,
        firstWeightSource: weighment.firstWeightSource,
        secondWeightSource: weighment.secondWeightSource,
        status: 'COMPLETED'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CORRECT_WEIGHMENT',
        entity: 'Weighment',
        entityId: weighment.id,
        details: `Requested correction for weighment ${weighment.slipNumber || weighment.id}. Reason: ${reason}`
      }
    });

    res.json(newWeighment);
  } catch (error) {
    res.status(500).json({ message: 'Error correcting weighment' });
  }
});

// Generate Slip PDF for a weighment
router.get('/:id/slip-pdf', async (req, res) => {
  try {
    const weighment = await prisma.weighment.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        customer: true,
        material: true,
        driver: true,
        transporter: true,
        operator: { select: { id: true, name: true } }
      }
    });

    if (!weighment) return res.status(404).json({ message: 'Weighment not found' });

    // Get company settings
    const settings = await prisma.companySetting.findFirst();
    const companyName = settings?.companyName || 'WEIGHBRIDGE';
    const companyAddress = settings?.address || '';
    const companyPhone = settings?.phone || '';
    const companyGstin = settings?.gstin || '';

    const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString('en-IN') : '--';
    const fmtDate = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
    const fmtTime = (d: Date | null | undefined) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';
    const fmtAmt = (n: number | null | undefined) => n != null ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '--';

    const slipTitle = weighment.status === 'COMPLETED' ? 'WEIGHBRIDGE SLIP' : 'WEIGHMENT RECEIPT (PARTIAL)';
    const netWt = weighment.netWeight != null ? `${fmt(weighment.netWeight)} KG` : '--';
    const amount = weighment.calculatedAmount != null ? fmtAmt(weighment.calculatedAmount) : '--';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Weighbridge Slip - ${weighment.slipNumber || weighment.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px; }
  .slip { max-width: 700px; margin: 0 auto; border: 2px solid #000; padding: 0; }
  .header { text-align: center; padding: 16px 16px 8px; border-bottom: 2px solid #000; }
  .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
  .header p { font-size: 11px; margin-top: 2px; color: #333; }
  .slip-title { text-align: center; background: #111; color: #fff; padding: 8px; font-size: 14px; font-weight: bold; letter-spacing: 3px; }
  .meta { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #ccc; font-size: 11px; }
  .section { padding: 12px 16px; border-bottom: 1px solid #ccc; }
  .section-title { font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .field { display: flex; flex-direction: column; }
  .field label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .field span { font-size: 12px; font-weight: 600; color: #111; }
  .weight-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .weight-table th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 10px; font-size: 10px; text-align: left; }
  .weight-table td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
  .net-row td { background: #111; color: #fff; font-weight: bold; font-size: 14px; }
  .amount-box { background: #f8f8f8; border: 2px solid #111; padding: 10px 16px; margin: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
  .amount-box .label { font-size: 11px; text-transform: uppercase; color: #555; }
  .amount-box .value { font-size: 20px; font-weight: bold; }
  .demo-badge { background: #ff6b00; color: #fff; font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px; display: inline-block; margin-top: 4px; }
  .signatures { display: flex; justify-content: space-between; padding: 30px 40px 16px; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #000; width: 150px; margin: 0 auto; padding-top: 4px; font-size: 10px; }
  .footer { text-align: center; font-size: 9px; color: #999; padding: 8px; border-top: 1px solid #ccc; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; }
  .status-COMPLETED { background: #d4edda; color: #155724; }
  .status-WAITING_FOR_SECOND_WEIGHT { background: #fff3cd; color: #856404; }
  .status-CANCELLED { background: #f8d7da; color: #721c24; }
</style>
</head>
<body>
<div class="slip">
  <div class="header">
    <h1>${companyName}</h1>
    ${companyAddress ? `<p>${companyAddress}</p>` : ''}
    ${companyPhone ? `<p>Phone: ${companyPhone}${companyGstin ? ` | GSTIN: ${companyGstin}` : ''}</p>` : ''}
    ${(weighment.customer?.name || '').includes('[DEMO]') || (weighment.vehicle?.vehicleNumber || '').includes('TN38AB') ? '<div class="demo-badge">⚠ DEMO / TEST RECORD</div>' : ''}
  </div>
  
  <div class="slip-title">${slipTitle}</div>
  
  <div class="meta">
    <div>
      <strong>Slip No:</strong> ${weighment.slipNumber || '—'}<br/>
      <strong>Status:</strong> <span class="status-badge status-${weighment.status}">${weighment.status.replace(/_/g, ' ')}</span>
    </div>
    <div style="text-align:right">
      <strong>Date:</strong> ${fmtDate(weighment.createdAt)}<br/>
      <strong>Time:</strong> ${fmtTime(weighment.firstWeightDate || weighment.createdAt)}
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Vehicle Details</div>
    <div class="grid2">
      <div class="field"><label>Vehicle Number</label><span>${weighment.vehicleNumber}</span></div>
      <div class="field"><label>Vehicle Type</label><span>${weighment.vehicle?.vehicleType || '—'}</span></div>
      <div class="field"><label>Driver</label><span>${weighment.driver?.name || '—'}</span></div>
      <div class="field"><label>Transporter</label><span>${weighment.transporter?.name || '—'}</span></div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Transaction Details</div>
    <div class="grid2">
      <div class="field"><label>Customer</label><span>${weighment.customer?.name || '—'}</span></div>
      <div class="field"><label>Material</label><span>${weighment.material?.name || '—'}</span></div>
      <div class="field"><label>Load Type</label><span>${weighment.loadType || '—'}</span></div>
      <div class="field"><label>Operator</label><span>${weighment.operator?.name || '—'}</span></div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Weight Details</div>
    <table class="weight-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Weight (KG)</th>
          <th>Source</th>
          <th>Date &amp; Time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>First Weight</strong></td>
          <td>${fmt(weighment.firstWeight ?? undefined)} KG</td>
          <td>${weighment.firstWeightSource || '—'}</td>
          <td>${fmtDate(weighment.firstWeightDate)} ${fmtTime(weighment.firstWeightDate)}</td>
        </tr>
        <tr>
          <td><strong>Second Weight</strong></td>
          <td>${weighment.secondWeight != null ? fmt(weighment.secondWeight) + ' KG' : '—'}</td>
          <td>${weighment.secondWeightSource || '—'}</td>
          <td>${weighment.secondWeightDate ? fmtDate(weighment.secondWeightDate) + ' ' + fmtTime(weighment.secondWeightDate) : '—'}</td>
        </tr>
        <tr class="net-row">
          <td>NET WEIGHT</td>
          <td colspan="3">${netWt}</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  ${weighment.calculatedAmount != null ? `
  <div class="amount-box">
    <div>
      <div class="label">Pricing: ${weighment.pricingType || '—'} | Rate: ${weighment.rate != null ? fmtAmt(weighment.rate) : '—'} / ${weighment.billingUnit || 'Unit'}</div>
      <div class="label">Quantity: ${weighment.calculatedQuantity != null ? weighment.calculatedQuantity.toFixed(3) : '—'} ${weighment.billingUnit || ''}</div>
    </div>
    <div>
      <div class="label">Total Amount</div>
      <div class="value">${amount}</div>
    </div>
  </div>` : ''}
  
  <div class="signatures">
    <div class="sig-box"><div class="sig-line">Operator Signature</div></div>
    <div class="sig-box"><div class="sig-line">Driver Signature</div></div>
    <div class="sig-box"><div class="sig-line">Authorized Signatory</div></div>
  </div>
  
  <div class="footer">Computer Generated Weighment Slip | ${companyName} | Generated: ${new Date().toLocaleString('en-IN')}</div>
</div>
</body>
</html>`;

    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="WeighbridgeSlip-${weighment.slipNumber || weighment.id}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (pdfErr) {
      // Fallback: return HTML if puppeteer fails
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="WeighbridgeSlip-${weighment.slipNumber || weighment.id}.html"`);
      res.send(html);
    }
  } catch (error: any) {
    console.error('Slip PDF error:', error);
    res.status(500).json({ message: 'Error generating slip PDF', error: error?.message });
  }
});

// Create First Weight (API-first, direct to PostgreSQL)
router.post('/first-weight', async (req, res) => {
  try {
    const { vehicleId, vehicleNumber, customerId, materialId, driverId, transporterId, firstWeight, unit, firstWeightSource, loadType } = req.body;
    
    if (!vehicleNumber) return res.status(400).json({ message: 'Vehicle number is required.' });

    // Ensure vehicle exists, or create it
    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId) {
      let vehicle = await prisma.vehicle.findUnique({ where: { vehicleNumber } });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({ data: { vehicleNumber } });
      }
      resolvedVehicleId = vehicle.id;
    }

    // Check for open weighment
    const existingOpen = await prisma.weighment.findFirst({
      where: { vehicleId: resolvedVehicleId, status: { in: ['OPEN', 'FIRST_WEIGHT_RECORDED', 'WAITING_FOR_SECOND_WEIGHT'] } }
    });

    if (existingOpen) {
      return res.status(400).json({ message: 'This vehicle already has an open weighment.', weighment: existingOpen });
    }

    // Generate sequential slip number
    const count = await prisma.weighment.count();
    const slipNumber = `WB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const weighment = await prisma.weighment.create({
      data: {
        vehicleId: resolvedVehicleId,
        vehicleNumber,
        customerId: customerId || null,
        materialId: materialId || null,
        driverId: driverId || null,
        transporterId: transporterId || null,
        firstWeight,
        firstWeightDate: new Date(),
        unit: unit || 'KG',
        status: 'WAITING_FOR_SECOND_WEIGHT',
        firstWeightSource: firstWeightSource || 'MANUAL',
        loadType: loadType || 'LOAD',
        slipNumber,
        // @ts-ignore
        operatorId: req.user?.id
      },
      include: { vehicle: true, customer: true, material: true, driver: true, transporter: true }
    });
    res.status(201).json(weighment);
  } catch (error: any) {
    console.error('First weight error:', error);
    res.status(500).json({ message: 'Error creating first weight', error: error?.message });
  }
});

// Update Second Weight and Complete
router.post('/second-weight', async (req, res) => {
  try {
    const { weighmentId, vehicleId, vehicleNumber, secondWeight, secondWeightSource, pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount } = req.body;
    
    // Find open weighment by id, vehicleId, or vehicleNumber
    let whereClause: any = { status: { in: ['OPEN', 'FIRST_WEIGHT_RECORDED', 'WAITING_FOR_SECOND_WEIGHT'] } };
    if (weighmentId) whereClause.id = weighmentId;
    else if (vehicleId) whereClause.vehicleId = vehicleId;
    else if (vehicleNumber) whereClause.vehicleNumber = vehicleNumber;
    else return res.status(400).json({ message: 'weighmentId, vehicleId, or vehicleNumber required.' });

    const openWeighment = await prisma.weighment.findFirst({ where: whereClause });

    if (!openWeighment) {
      return res.status(404).json({ message: 'No open weighment found for this vehicle.' });
    }
    
    if (openWeighment.firstWeight == null) {
      return res.status(400).json({ message: 'First weight is not recorded yet.' });
    }

    if (Number(secondWeight) === Number(openWeighment.firstWeight)) {
      return res.status(400).json({ message: 'Second weight cannot be identical to the first weight.' });
    }
    
    if (Number(secondWeight) <= 0) {
      return res.status(400).json({ message: 'Second weight must be greater than zero.' });
    }

    const netWeight = Math.abs(Number(secondWeight) - Number(openWeighment.firstWeight));

    const weighment = await prisma.weighment.update({
      where: { id: openWeighment.id },
      data: {
        secondWeight,
        secondWeightDate: new Date(),
        secondWeightSource: secondWeightSource || 'MANUAL',
        netWeight,
        status: 'COMPLETED',
        completedAt: new Date(),
        pricingType: pricingType || null,
        rate: rate || null,
        billingUnit: billingUnit || null,
        calculatedQuantity: calculatedQuantity || null,
        calculatedAmount: calculatedAmount || null,
      },
      include: { vehicle: true, customer: true, material: true, driver: true, transporter: true }
    });
    res.status(200).json(weighment);
  } catch (error: any) {
    console.error('Second weight error:', error);
    res.status(500).json({ message: 'Error recording second weight', error: error?.message });
  }
});

// Get pending weighments
router.get('/pending', async (req, res) => {
  try {
    const weighments = await prisma.weighment.findMany({
      where: { status: 'WAITING_FOR_SECOND_WEIGHT' },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
        customer: true,
        material: true,
        driver: true,
        transporter: true
      }
    });
    res.json(weighments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending weighments' });
  }
});

// Get active weighment for a vehicle (by vehicleId or vehicleNumber)
router.get('/active/:vehicleRef', async (req, res) => {
  try {
    const ref = req.params.vehicleRef;
    const where: any = { status: { in: ['OPEN', 'FIRST_WEIGHT_RECORDED', 'WAITING_FOR_SECOND_WEIGHT'] } };
    // Try by ID first, then by vehicleNumber
    const byId = await prisma.weighment.findFirst({
      where: { ...where, vehicleId: ref },
      include: { vehicle: true, customer: true, material: true, driver: true, transporter: true }
    });
    if (byId) return res.json(byId);

    const byNum = await prisma.weighment.findFirst({
      where: { ...where, vehicleNumber: ref },
      include: { vehicle: true, customer: true, material: true, driver: true, transporter: true }
    });
    if (byNum) return res.json(byNum);

    return res.status(404).json({ message: 'No active weighment found' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active weighment' });
  }
});

// Sync Offline Weighments (SQLite → PostgreSQL)
router.post('/', async (req, res) => {
  try {
    const { 
      id, vehicleId, vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId, 
      firstWeight, secondWeight, netWeight, status, date,
      pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount, pricingSnapshot,
      loadType, firstWeightSource, secondWeightSource
    } = req.body;

    if (!vehicleNumber) return res.status(400).json({ message: 'vehicleNumber required for sync' });

    // Ensure vehicle exists in PostgreSQL
    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId) {
      let vehicle = await prisma.vehicle.findUnique({ where: { vehicleNumber } });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({ data: { vehicleNumber } });
      }
      resolvedVehicleId = vehicle.id;
    } else {
      // Check if vehicleId exists, if not fall back to vehicleNumber lookup
      const vehicle = await prisma.vehicle.findUnique({ where: { id: resolvedVehicleId } });
      if (!vehicle) {
        let vByNum = await prisma.vehicle.findUnique({ where: { vehicleNumber } });
        if (!vByNum) vByNum = await prisma.vehicle.create({ data: { vehicleNumber } });
        resolvedVehicleId = vByNum.id;
      }
    }

    const weighment = await prisma.weighment.upsert({
      where: { id: id || '__nonexistent__' },
      update: {
        vehicleId: resolvedVehicleId, vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId,
        firstWeight, secondWeight, netWeight, status,
        pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount, pricingSnapshot,
        loadType, firstWeightSource, secondWeightSource
      },
      create: {
        id,
        vehicleId: resolvedVehicleId, vehicleNumber, slipNumber, customerId, materialId, driverId, transporterId,
        firstWeight, secondWeight, netWeight, status,
        createdAt: new Date(date || new Date()),
        pricingType, rate, billingUnit, calculatedQuantity, calculatedAmount, pricingSnapshot,
        loadType, firstWeightSource, secondWeightSource
      }
    });

    res.status(200).json(weighment);
  } catch (error: any) {
    if (error.code === 'P2002' && req.body.slipNumber) {
       try {
         const weighment = await prisma.weighment.upsert({
           where: { slipNumber: req.body.slipNumber },
           update: req.body,
           create: { ...req.body, createdAt: new Date(req.body.date || new Date()) }
         });
         return res.status(200).json(weighment);
       } catch (fallbackError) {
         return res.status(500).json({ message: 'Error syncing weighment' });
       }
    }
    console.error('Sync weighment error:', error);
    res.status(500).json({ message: 'Error syncing weighment', error: error?.message });
  }
});

export default router;