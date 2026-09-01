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
      select: { id: true, username: true, role: true, isDeleted: true, lastActiveAt: true }
    });

    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token does no longer exist.' });
    }

    // Non-blocking update activity if > 30 seconds since last update
    const now = Date.now();
    if (!user.lastActiveAt || now - new Date(user.lastActiveAt).getTime() > 30000) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent']?.substring(0, 500) || null;
      prisma.user.update({
        where: { id: user.id },
        data: {
          lastActiveAt: new Date(),
          lastIpAddress: ip,
          lastUserAgent: userAgent
        }
      }).catch(() => {});
    }

    const userRoles = String(user.role || 'user').toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
    req.user = {
      ...user,
      roles: userRoles
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

export const authorize = (...roles) => {
  const allowed = roles.map(r => String(r).toLowerCase().trim());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    const userRoles = req.user.roles || String(req.user.role || '').toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
    const isAuthorized = userRoles.some(r => allowed.includes(r));

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: `User roles [${userRoles.join(', ')}] are not authorized to access this route`
      });
    }
    next();
  };
};
