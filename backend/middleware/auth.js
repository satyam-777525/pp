const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // Verify user still exists and is approved
    const [users] = await db.pool.query(
      'SELECT id, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (users[0].status !== 'approved') {
      return res.status(403).json({ message: 'Account not approved' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const isRetailer = (req, res, next) => {
  if (req.user.role !== 'retailer') {
    return res.status(403).json({ message: 'Retailer access required' });
  }
  next();
};

module.exports = { authenticate, isAdmin, isRetailer };

