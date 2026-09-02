import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();
router.use(authenticate);

// Get all invoice sequences
router.get('/', async (req, res) => {
  try {
    let sequences = await prisma.invoiceSequence.findMany();
    
    // Auto-create default 'ALL' sequence if none exists
    if (sequences.length === 0) {
      const newSeq = await prisma.invoiceSequence.create({
        data: { invoiceType: 'ALL', prefix: 'INV-', startingNumber: 1, currentNumber: 0 }
      });
      sequences = [newSeq];
    }
    
    res.json(sequences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching invoice sequences' });
  }
});

// Update invoice sequences
router.put('/', async (req, res) => {
  try {
    const sequences = req.body.sequences; // Expect array
    if (!Array.isArray(sequences)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const updated = await prisma.$transaction(
      sequences.map((seq: any) => {
        return prisma.invoiceSequence.upsert({
          where: { invoiceType: seq.invoiceType },
          update: {
            prefix: seq.prefix,
            suffix: seq.suffix,
            startingNumber: seq.startingNumber,
            autoIncrementEnabled: seq.autoIncrementEnabled
          },
          create: {
            invoiceType: seq.invoiceType,
            prefix: seq.prefix,
            suffix: seq.suffix,
            startingNumber: seq.startingNumber,
            currentNumber: seq.startingNumber > 1 ? seq.startingNumber - 1 : 0,
            autoIncrementEnabled: seq.autoIncrementEnabled
          }
        });
      })
    );
    
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating invoice sequences' });
  }
});

// Get next invoice number for preview
router.get('/next', async (req, res) => {
  try {
    const type = (req.query.type as string) || 'ALL';
    
    let seq = await prisma.invoiceSequence.findUnique({
      where: { invoiceType: type }
    });
    
    if (!seq) {
      // Fallback to ALL
      seq = await prisma.invoiceSequence.findUnique({
        where: { invoiceType: 'ALL' }
      });
    }
    
    if (!seq) {
       return res.json({ nextInvoiceNumber: 'INV-1' });
    }
    
    const nextNum = Math.max(seq.startingNumber, seq.currentNumber + 1);
    const prefix = seq.prefix || '';
    const suffix = seq.suffix || '';
    
    res.json({ nextInvoiceNumber: `${prefix}${nextNum}${suffix}` });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching next sequence' });
  }
});

export default router;
