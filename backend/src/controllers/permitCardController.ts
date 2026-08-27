import { Request, Response } from 'express';
import prisma from '../prisma';

// Generate internal Permit Reference automatically (e.g., PER-2024-001)
const generatePermitReference = async () => {
  const lastPermit = await prisma.permitCard.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  
  if (!lastPermit) {
    return 'PER-1000';
  }
  
  const lastNumber = parseInt(lastPermit.permitReference.replace('PER-', ''), 10);
  if (isNaN(lastNumber)) return `PER-${Date.now()}`;
  return `PER-${lastNumber + 1}`;
};

export const getPermitCards = async (req: Request, res: Response) => {
  try {
    const permits = await prisma.permitCard.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(permits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch permit cards' });
  }
};

export const getPermitCardById = async (req: Request, res: Response) => {
  try {
    const permit = await prisma.permitCard.findUnique({
      where: { id: req.params.id as string },
    });
    if (!permit) {
      return res.status(404).json({ error: 'Permit Card not found' });
    }
    res.json(permit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch permit card' });
  }
};

export const createPermitCard = async (req: Request, res: Response) => {
  try {
    const permitReference = await generatePermitReference();
    const data = { ...req.body, permitReference };
    
    // Sanitize empty foreign keys and date
    if (!data.vehicleId) delete data.vehicleId;
    if (!data.customerId) delete data.customerId;
    if (!data.materialId) delete data.materialId;
    if (!data.driverId) delete data.driverId;
    if (data.date) data.date = new Date(data.date).toISOString();

    const newPermit = await prisma.permitCard.create({
      data
    });
    res.status(201).json(newPermit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create permit card' });
  }
};

export const updatePermitCard = async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (!data.vehicleId) delete data.vehicleId;
    if (!data.customerId) delete data.customerId;
    if (!data.materialId) delete data.materialId;
    if (!data.driverId) delete data.driverId;
    if (data.date) data.date = new Date(data.date).toISOString();
    
    const updatedPermit = await prisma.permitCard.update({
      where: { id: req.params.id as string },
      data,
    });
    res.json(updatedPermit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update permit card' });
  }
};

// Template Settings
export const getPermitTemplate = async (req: Request, res: Response) => {
  try {
    let template = await prisma.permitCardTemplate.findFirst();
    if (!template) {
      template = await prisma.permitCardTemplate.create({ data: {} });
    }
    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch permit template' });
  }
};

export const updatePermitTemplate = async (req: Request, res: Response) => {
  try {
    let template = await prisma.permitCardTemplate.findFirst();
    if (template) {
      template = await prisma.permitCardTemplate.update({
        where: { id: template.id },
        data: req.body,
      });
    } else {
      template = await prisma.permitCardTemplate.create({ data: req.body });
    }
    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update permit template' });
  }
};

import { generatePermitHtml, generatePermitPdf } from '../utils/permitPdfGenerator';

export const generatePermitPdfEndpoint = async (req: Request, res: Response) => {
  try {
    const permit = req.body;
    
    // Fetch the template to include fixed fields and images in the PDF
    const template = await prisma.permitCardTemplate.findFirst();
    
    const html = generatePermitHtml(permit, template);
    
    try {
      const pdfBuffer = await generatePermitPdf(html);
      res.contentType('application/pdf');
      res.send(pdfBuffer);
    } catch (pdfError) {
      console.error('Puppeteer failed on backend, sending HTML fallback to Electron', pdfError);
      // Send HTML string with a specific status or header so frontend can convert it via Electron IPC
      res.setHeader('X-Fallback-Html', 'true');
      res.contentType('text/html');
      res.send(html);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate permit PDF' });
  }
};
