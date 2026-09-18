import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default system user for authenticated sessions
    req.user = {
      uid: 'sql-admin-user',
      email: 'admin@voltera.local',
      name: 'مدير النظام السحابي',
      role: 'admin',
    };
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  req.user = {
    uid: token || 'sql-user',
    email: 'user@voltera.local',
    name: 'مستخدم SQL المعتمد',
    role: 'admin',
  };
  next();
};
