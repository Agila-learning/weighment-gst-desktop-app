import prisma from '../prisma';
import bcrypt from 'bcryptjs';

export async function seedDemoData() {
  try {
    // 1. Check if Demo Admin exists
    const demoAdminExists = await prisma.user.findUnique({
      where: { email: 'demo@example.com' }
    });

    if (!demoAdminExists) {
      console.log('🌱 Seeding demo data...');
      
      const hash = await bcrypt.hash('Demo@123', 10);
      
      // Create Demo Admin
      const demoUser = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          username: 'demo_admin',
          name: '[DEMO] Demo Admin',
          password: hash,
          role: 'ADMIN',
          applicationAccess: ['GST_BILLING', 'WEIGHBRIDGE']
        }
      });
      console.log('✅ Demo Admin created');

      // 2. Create Demo Customer
      const demoCustomer = await prisma.customer.create({
        data: {
          name: '[DEMO] Demo Customer',
          phone: '9876543210',
          isActive: true
        }
      });
      console.log('✅ Demo Customer created');

      // 3. Create Demo Material
      let demoMaterial = await prisma.material.findFirst({ where: { name: 'Demo Sand' } });
      if (!demoMaterial) {
        // Find a default tax rate
        const taxRate = await prisma.taxRate.findFirst();
        if (taxRate) {
          demoMaterial = await prisma.material.create({
            data: {
              name: 'Demo Sand',
              unit: 'TON',
              billingUnit: 'TON',
              pricingType: 'PER_TON',
              defaultRate: 500,
              gstRateId: taxRate.id,
              isActive: true
            }
          });
          console.log('✅ Demo Material created');
        }
      }

      // 4. Create Demo Driver & Transporter
      const demoDriver = await prisma.driver.create({
        data: { name: '[DEMO] Demo Driver', mobile: '9988776655' }
      });
      
      const demoTransporter = await prisma.transporter.create({
        data: { name: '[DEMO] Demo Transporter' }
      });
      console.log('✅ Demo Driver & Transporter created');

      // 5. Create Demo Vehicle
      const demoVehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber: 'TN38AB1234',
          vehicleType: 'Tipper',
          driverId: demoDriver.id,
          transporterId: demoTransporter.id,
          isActive: true
        }
      });
      console.log('✅ Demo Vehicle created');

      // 6. Create Demo Weighment
      if (demoMaterial) {
        const count = await prisma.weighment.count();
        const slipNumber = `WB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        
        const firstWeight = 18500;
        const secondWeight = 8500;
        const netWeight = 10000;
        const qty = netWeight / 1000; // TON
        const rate = 500;
        const amount = qty * rate;

        const firstDate = new Date();
        firstDate.setHours(firstDate.getHours() - 2);

        await prisma.weighment.create({
          data: {
            slipNumber,
            vehicleId: demoVehicle.id,
            vehicleNumber: demoVehicle.vehicleNumber,
            customerId: demoCustomer.id,
            materialId: demoMaterial.id,
            driverId: demoDriver.id,
            transporterId: demoTransporter.id,
            operatorId: demoUser.id,
            firstWeight,
            secondWeight,
            netWeight,
            firstWeightSource: 'MANUAL',
            secondWeightSource: 'MANUAL',
            status: 'COMPLETED',
            unit: 'KG',
            loadType: 'LOAD',
            pricingType: 'PER_UNIT',
            billingUnit: 'TON',
            rate,
            calculatedQuantity: qty,
            calculatedAmount: amount,
            firstWeightDate: firstDate,
            secondWeightDate: new Date(),
            completedAt: new Date()
          }
        });
        console.log('✅ Demo Weighment created');
      }

      console.log('🎉 Demo data seeding complete!');
    }
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
  }
}
