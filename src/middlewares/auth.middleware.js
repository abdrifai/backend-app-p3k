import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req, res, next) => {
  let token;

  // Check cookies first (if using cookies for JWT)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Fallback to Bearer token in headers
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // We only need basic user info in req.user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, isDeleted: true }
    });

    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token does no longer exist.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `User role ${req.user?.role} is not authorized to access this route`
      });
    }
    next();
  };
};
