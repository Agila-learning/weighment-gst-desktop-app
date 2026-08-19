import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; application?: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.user = { id: decoded.id, role: decoded.role, application: decoded.application };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAppType = (allowedAppType: 'GST_BILLING' | 'WEIGHBRIDGE') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // If authenticated via token, check token application context
    if (req.user?.application && req.user.application !== allowedAppType) {
      return res.status(403).json({ message: 'Forbidden: Invalid Application Context' });
    }
    
    // Fallback to headers if not enforced by token context (e.g. legacy/public endpoints)
    if (!req.user?.application) {
      const appTypeHeader = req.headers['x-app-type'] || req.query.appType;
      if (appTypeHeader !== allowedAppType && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Invalid Application Type' });
      }
    }
    next();
  };
};
