import prisma from './src/prisma';
import { generateInvoicePDF } from './src/utils/pdfGenerator';
import fs from 'fs';

async function main() {
  try {
    const invoice = await prisma.invoice.findFirst();
    if (invoice) {
      console.log('Generating PDF for invoice', invoice.id);
      const pdf = await generateInvoicePDF(invoice.id);
      fs.writeFileSync('test.pdf', pdf);
      console.log('PDF Generated successfully!');
    } else {
      console.log('No invoices found');
    }
  } catch (error) {
    console.error('PDF Generation Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
