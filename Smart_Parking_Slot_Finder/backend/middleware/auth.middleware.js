import jwt from 'jsonwebtoken';
export function protect(...roles) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ message: 'Authentication required' });
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) return res.status(403).json({ message: 'Access denied' });
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}
