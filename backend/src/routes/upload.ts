import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticate);

router.post('/customers', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

    let count = 0;
    for (const row of data) {
      if (row.Name) {
        await prisma.customer.create({
          data: {
            name: row.Name,
            gstin: row.GSTIN || null,
            phone: row.Phone ? String(row.Phone) : null,
            email: row.Email || null,
            address: row.Address || null,
          }
        });
        count++;
      }
    }
    res.json({ message: `Successfully imported ${count} customers` });
  } catch (error) {
    res.status(500).json({ message: 'Error processing excel file' });
  }
});

export default router;
