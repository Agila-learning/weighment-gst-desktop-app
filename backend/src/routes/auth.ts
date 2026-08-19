import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password, application } = req.body;
  const usernameOrEmail = email; // Alias for simplicity since frontend might send 'email'

  try {
    if (!application) {
      return res.status(400).json({ message: 'Application context is required' });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: usernameOrEmail },
          { username: usernameOrEmail }
        ]
      }
    });

    if (!user && (usernameOrEmail === 'admin@example.com' || usernameOrEmail === 'admin')) {
      // Auto-create admin for testing
      const hash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          username: 'admin',
          name: 'System Admin',
          password: hash,
          role: 'ADMIN',
          applicationAccess: ['GST_BILLING', 'WEIGHBRIDGE']
        }
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Your account is inactive or locked.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    if (!user.applicationAccess.includes(application)) {
      return res.status(403).json({ message: 'You do not have permission to access this application.' });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, application },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        applicationAccess: user.applicationAccess
      },
      // Send hash only if application is WEIGHBRIDGE to allow local caching for offline login
      offlineHash: application === 'WEIGHBRIDGE' ? user.password : undefined
    });
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /me to fetch user details
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Invalid user or inactive' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      applicationAccess: user.applicationAccess
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router;
