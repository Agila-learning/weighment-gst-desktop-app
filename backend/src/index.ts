import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import prisma from './prisma';
import customersRoutes from './routes/customers';
import materialsRoutes from './routes/materials';
import vehiclesRoutes from './routes/vehicles';
import settingsRoutes from './routes/settings';
import invoicesRoutes from './routes/invoices';
import reportsRoutes from './routes/reports';
import uploadRoutes from './routes/upload';
import auditRoutes from './routes/audit';
import dataRoutes from './routes/importExport';
import driversRoutes from './routes/drivers';
import paymentsRoutes from './routes/payments';
import transportersRoutes from './routes/transporters';
import weighmentsRoutes from './routes/weighments';
import weighmentReportsRouter from './routes/weighment-reports';
import weighmentExportsRouter from './routes/weighment-exports';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/transporters', transportersRoutes);
app.use('/api/weighments', weighmentsRoutes);
app.use('/api/weighment-reports', weighmentReportsRouter);
app.use('/api/weighment-exports', weighmentExportsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', async (req, res) => {
  try {
    // Test the Prisma database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "OK",
      backend: "connected",
      database: "connected"
    });
  } catch (error) {
    console.error('Health check database connection failed:', error);
    res.status(500).json({
      status: "ERROR",
      backend: "connected",
      database: "disconnected"
    });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
