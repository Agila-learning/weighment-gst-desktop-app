import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.use(authenticate);

// Get Company Settings
router.get('/company', async (req, res) => {
  try {
    const settings = await prisma.companySetting.findFirst();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching company settings' });
  }
});

// Update Company Settings
router.post('/company', async (req, res) => {
  try {
    const { companyName, address, stateName, stateCode, gstin, phone, email, invoicePrefix, bankDetails, upiDetails, declaration, termsAndConditions, authSignatoryName, authSignatoryDesignation, signatureImageUrl, logoUrl, sealImageUrl, upiId, showQrOnInvoice } = req.body;
    const updateData = { companyName, address, stateName, stateCode, gstin, phone, email, invoicePrefix, bankDetails, upiDetails, declaration, termsAndConditions, authSignatoryName, authSignatoryDesignation, signatureImageUrl, logoUrl, sealImageUrl, upiId, showQrOnInvoice };

    let settings = await prisma.companySetting.findFirst();
    if (settings) {
      settings = await prisma.companySetting.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      settings = await prisma.companySetting.create({
        data: updateData as any // Typescript trick to bypass strict checking on optional fields if they are undefined
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error saving company settings' });
  }
});

// Get Tax Rates
router.get('/taxes', async (req, res) => {
  try {
    const taxes = await prisma.taxRate.findMany({
      where: { isActive: true }
    });
    res.json(taxes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tax rates' });
  }
});

// Create Tax Rate
router.post('/taxes', async (req, res) => {
  try {
    const tax = await prisma.taxRate.create({
      data: req.body
    });
    res.status(201).json(tax);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tax rate' });
  }
});

// Delete Tax Rate
router.delete('/taxes/:id', async (req, res) => {
  try {
    // Soft delete taxes by updating isActive
    await prisma.taxRate.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tax rate' });
  }
});

export default router;
