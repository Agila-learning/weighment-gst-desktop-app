import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import prisma from '../prisma';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// TEMPLATE GENERATOR
router.get('/template/:type', (req, res) => {
  try {
    const { type } = req.params;
    const wb = xlsx.utils.book_new();
    
    let headers: string[] = [];
    let exampleRow: any = {};
    let instructions = [];
    
    if (type === 'customers') {
      headers = ['Customer Code', 'Customer Name', 'Company Name', 'GSTIN', 'Address', 'City', 'District', 'State', 'State Code', 'Mobile', 'Email', 'Payment Terms', 'Credit Limit', 'Status'];
      exampleRow = { 'Customer Name': 'ABC Builders', 'GSTIN': '29ABCDE1234F1Z5', 'State Code': '29', 'Mobile': '9876543210' };
      instructions = [['Customer Name is required'], ['GSTIN should be valid 15 char if provided'], ['State Code is required if GSTIN is provided']];
    } else if (type === 'materials') {
      headers = ['Material Code', 'Material Name', 'Category', 'Description', 'HSN/SAC', 'Unit', 'Default Rate', 'Rate Unit', 'GST Rate', 'Tax Type', 'Status'];
      exampleRow = { 'Material Name': 'M-Sand', 'HSN/SAC': '2505', 'Unit': 'TON', 'Default Rate': 1500, 'GST Rate': 5 };
      instructions = [['Material Name, HSN/SAC, Unit, Default Rate, GST Rate are required']];
    } else if (type === 'vehicles') {
      headers = ['Vehicle Number', 'Vehicle Type', 'Vehicle Category', 'Capacity', 'Owner Name', 'Owner Mobile', 'Driver Name', 'Driver Mobile', 'Transporter Name', 'Transporter Mobile', 'Status'];
      exampleRow = { 'Vehicle Number': 'KA-01-AB-1234', 'Vehicle Type': 'Truck', 'Capacity': 10 };
      instructions = [['Vehicle Number and Vehicle Type are required']];
    } else if (type === 'drivers') {
      headers = ['Name', 'Mobile', 'License Number', 'License Expiry', 'Address', 'Transporter Name', 'Status'];
      exampleRow = { 'Name': 'John Doe', 'Mobile': '9876543210', 'License Number': 'DL-123456' };
      instructions = [['Name and Mobile are required']];
    } else {
      return res.status(400).json({ message: 'Invalid template type' });
    }

    const wsData = xlsx.utils.json_to_sheet([exampleRow], { header: headers });
    xlsx.utils.book_append_sheet(wb, wsData, 'Data');
    
    const wsInstructions = xlsx.utils.aoa_to_sheet(instructions);
    xlsx.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PREVIEW
router.post('/preview/:type', upload.single('file'), async (req, res) => {
  try {
    const { type } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(ws);
    
    const previewData = [];
    
    if (type === 'customers') {
      const existing = await prisma.customer.findMany({ select: { gstin: true, name: true, phone: true } });
      
      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        let status = 'VALID';
        let message = 'Valid Record';
        
        if (!row['Customer Name']) {
          status = 'ERROR';
          message = 'Customer Name is required';
        } else if (row['GSTIN'] && existing.some(e => e.gstin === row['GSTIN'])) {
          status = 'WARNING';
          message = 'GSTIN already exists (Duplicate)';
        }
        
        previewData.push({ rowNumber: i + 2, data: row, status, message });
      }
    } else if (type === 'materials') {
      const existing = await prisma.material.findMany({ select: { name: true } });
      
      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        let status = 'VALID';
        let message = 'Valid Record';
        
        if (!row['Material Name'] || !row['Default Rate'] || !row['GST Rate']) {
          status = 'ERROR';
          message = 'Missing required fields (Name, Rate, GST Rate)';
        } else if (existing.some(e => e.name === row['Material Name'])) {
          status = 'WARNING';
          message = 'Material Name already exists (Duplicate)';
        }
        
        previewData.push({ rowNumber: i + 2, data: row, status, message });
      }
    } else if (type === 'vehicles') {
      const existing = await prisma.vehicle.findMany({ select: { vehicleNumber: true } });
      
      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        let status = 'VALID';
        let message = 'Valid Record';
        
        if (!row['Vehicle Number']) {
          status = 'ERROR';
          message = 'Vehicle Number is required';
        } else if (existing.some(e => e.vehicleNumber === row['Vehicle Number'])) {
          status = 'WARNING';
          message = 'Vehicle Number already exists (Duplicate)';
        }
        
        previewData.push({ rowNumber: i + 2, data: row, status, message });
      }
    } else if (type === 'drivers') {
      const existing = await prisma.driver.findMany({ select: { mobile: true, name: true } });
      
      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        let status = 'VALID';
        let message = 'Valid Record';
        
        if (!row['Name'] || !row['Mobile']) {
          status = 'ERROR';
          message = 'Name and Mobile are required';
        } else if (existing.some(e => e.mobile === row['Mobile'])) {
          status = 'WARNING';
          message = 'Mobile already exists (Duplicate)';
        }
        
        previewData.push({ rowNumber: i + 2, data: row, status, message });
      }
    }
    
    res.json(previewData);
  } catch (err: any) {
    res.status(500).json({ message: 'Error processing file: ' + err.message });
  }
});

// COMMIT
router.post('/commit/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { mode, records, fileName } = req.body;
    // mode: ADD, UPDATE, ADD_UPDATE
    
    let created = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    if (type === 'customers') {
      for (const record of records) {
        const gstin = record['GSTIN'];
        const existing = gstin ? await prisma.customer.findUnique({ where: { gstin } }) : null;
        
        if (existing) {
          if (mode === 'UPDATE' || mode === 'ADD_UPDATE') {
            await prisma.customer.update({
              where: { id: existing.id },
              data: {
                name: record['Customer Name'],
                phone: record['Mobile']?.toString(),
                email: record['Email'],
                address: record['Address'],
                stateCode: record['State Code']?.toString()
              }
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          if (mode === 'ADD' || mode === 'ADD_UPDATE') {
            await prisma.customer.create({
              data: {
                name: record['Customer Name'],
                gstin: record['GSTIN'],
                phone: record['Mobile']?.toString(),
                email: record['Email'],
                address: record['Address'],
                stateCode: record['State Code']?.toString()
              }
            });
            created++;
          } else {
            skipped++;
          }
        }
      }
    } else if (type === 'materials') {
      // Must map GST Rate to TaxRate ID
      const taxRates = await prisma.taxRate.findMany();
      
      for (const record of records) {
        const name = record['Material Name'];
        const existing = name ? await prisma.material.findUnique({ where: { name } }) : null;
        
        const gstRateVal = record['GST Rate'];
        let taxRateId = taxRates[0]?.id; // default fallback
        
        if (gstRateVal !== undefined) {
          const match = taxRates.find(t => (t.cgst + t.sgst + t.igst) === Number(gstRateVal));
          if (match) taxRateId = match.id;
        }
        
        if (existing) {
          if (mode === 'UPDATE' || mode === 'ADD_UPDATE') {
            await prisma.material.update({
              where: { id: existing.id },
              data: {
                hsnCode: record['HSN/SAC']?.toString(),
                unit: record['Unit'] || 'TON',
                defaultRate: Number(record['Default Rate']) || 0,
                gstRateId: taxRateId
              }
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          if (mode === 'ADD' || mode === 'ADD_UPDATE') {
            await prisma.material.create({
              data: {
                name,
                hsnCode: record['HSN/SAC']?.toString(),
                unit: record['Unit'] || 'TON',
                defaultRate: Number(record['Default Rate']) || 0,
                gstRateId: taxRateId
              }
            });
            created++;
          } else {
            skipped++;
          }
        }
      }
    } else if (type === 'vehicles') {
      for (const record of records) {
        const vehicleNumber = record['Vehicle Number'];
        const existing = vehicleNumber ? await prisma.vehicle.findUnique({ where: { vehicleNumber } }) : null;
        
        if (existing) {
          if (mode === 'UPDATE' || mode === 'ADD_UPDATE') {
            await prisma.vehicle.update({
              where: { id: existing.id },
              data: {
                vehicleType: record['Vehicle Type'],
                capacityWeight: Number(record['Capacity']) || 0,
                transporterInfo: record['Transporter Name']
              }
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          if (mode === 'ADD' || mode === 'ADD_UPDATE') {
            await prisma.vehicle.create({
              data: {
                vehicleNumber,
                vehicleType: record['Vehicle Type'],
                capacityWeight: Number(record['Capacity']) || 0,
                transporterInfo: record['Transporter Name']
              }
            });
            created++;
          } else {
            skipped++;
          }
        }
      }
    } else if (type === 'drivers') {
      for (const record of records) {
        const mobile = record['Mobile']?.toString();
        // Since mobile isn't guaranteed unique in schema, we just check name+mobile roughly, or just insert
        // Assuming we update if mobile matches
        const existing = mobile ? await prisma.driver.findFirst({ where: { mobile } }) : null;
        
        if (existing) {
          if (mode === 'UPDATE' || mode === 'ADD_UPDATE') {
            await prisma.driver.update({
              where: { id: existing.id },
              data: {
                name: record['Name'],
                licenseNumber: record['License Number'],
                address: record['Address'],
                transporterName: record['Transporter Name']
              }
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          if (mode === 'ADD' || mode === 'ADD_UPDATE') {
            await prisma.driver.create({
              data: {
                name: record['Name'],
                mobile,
                licenseNumber: record['License Number'],
                address: record['Address'],
                transporterName: record['Transporter Name']
              }
            });
            created++;
          } else {
            skipped++;
          }
        }
      }
    }

    await prisma.importHistory.create({
      data: {
        fileName: fileName || 'unknown.xlsx',
        importType: type.toUpperCase(),
        uploadedBy: 'System', // from JWT in real app
        totalRows: records.length,
        created,
        updated,
        skipped,
        failed,
        status: 'Completed'
      }
    });

    res.json({ created, updated, skipped, failed, total: records.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// EXPORT
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let data: any[] = [];
    
    if (type === 'customers') {
      const customers = await prisma.customer.findMany();
      data = customers.map(c => ({
        'Customer Name': c.name,
        'GSTIN': c.gstin,
        'Mobile': c.phone,
        'Email': c.email,
        'Address': c.address,
        'State Code': c.stateCode,
        'Status': c.isActive ? 'Active' : 'Inactive'
      }));
    } else if (type === 'materials') {
      const materials = await prisma.material.findMany({ include: { taxRate: true } });
      data = materials.map(m => ({
        'Material Name': m.name,
        'HSN/SAC': m.hsnCode,
        'Unit': m.unit,
        'Default Rate': m.defaultRate,
        'GST Rate': (m.taxRate?.cgst || 0) + (m.taxRate?.sgst || 0) + (m.taxRate?.igst || 0),
        'Status': m.isActive ? 'Active' : 'Inactive'
      }));
    } else if (type === 'vehicles') {
      const vehicles = await prisma.vehicle.findMany();
      data = vehicles.map(v => ({
        'Vehicle Number': v.vehicleNumber,
        'Vehicle Type': v.vehicleType,
        'Capacity': v.capacityWeight,
        'Transporter': v.transporterInfo,
        'Status': v.isActive ? 'Active' : 'Inactive'
      }));
    } else if (type === 'drivers') {
      const drivers = await prisma.driver.findMany();
      data = drivers.map(d => ({
        'Name': d.name,
        'Mobile': d.mobile,
        'License Number': d.licenseNumber,
        'Address': d.address,
        'Transporter': d.transporterName,
        'Status': d.isActive ? 'Active' : 'Inactive'
      }));
    } else if (type === 'invoices' || type === 'sales') {
      const invoices = await prisma.invoice.findMany({ include: { customer: true, vehicle: true } });
      data = invoices.map(i => ({
        'Invoice Number': i.invoiceNumber,
        'Date': i.date,
        'Customer Name': i.buyerName || i.customer?.name,
        'GSTIN': i.buyerGstin || i.customer?.gstin,
        'Vehicle Number': i.snapshotVehicleNumber || i.vehicle?.vehicleNumber,
        'Taxable Value': i.subTotal,
        'Tax Amount': i.taxTotal,
        'Grand Total': i.grandTotal,
        'Status': i.status
      }));
    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Export Data');
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
