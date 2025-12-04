const express = require('express');
const db = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const [users] = await db.pool.query(
      `SELECT id, email, business_name, gst_tax_id, contact_person, phone, address, 
              role, status, credit_limit, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending users (admin only)
router.get('/pending', authenticate, isAdmin, async (req, res) => {
  try {
    const [users] = await db.pool.query(
      `SELECT id, email, business_name, gst_tax_id, contact_person, phone, address, 
              role, status, credit_limit, created_at
       FROM users
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject user (admin only)
router.patch('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, credit_limit } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateFields = ['status = ?'];
    const values = [status];

    if (status === 'approved' && credit_limit !== undefined) {
      updateFields.push('credit_limit = ?');
      values.push(credit_limit || 0);
    }

    values.push(id);

    await db.pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: `User ${status} successfully` });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update credit limit (admin only)
router.patch('/:id/credit-limit', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { credit_limit } = req.body;

    if (credit_limit === undefined || credit_limit < 0) {
      return res.status(400).json({ message: 'Invalid credit limit' });
    }

    await db.pool.query(
      'UPDATE users SET credit_limit = ? WHERE id = ?',
      [credit_limit, id]
    );

    res.json({ message: 'Credit limit updated successfully' });
  } catch (error) {
    console.error('Update credit limit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const [users] = await db.pool.query(
      `SELECT id, email, business_name, gst_tax_id, contact_person, phone, address, 
              role, status, credit_limit, created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current credit balance
    const [credit] = await db.pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_owed
       FROM credit_transactions
       WHERE user_id = ? AND transaction_type = 'credit_purchase'`,
      [req.user.id]
    );

    const [payments] = await db.pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM credit_transactions
       WHERE user_id = ? AND transaction_type = 'payment'`,
      [req.user.id]
    );

    const balance = parseFloat(credit[0].total_owed) - parseFloat(payments[0].total_paid);
    const available_credit = users[0].credit_limit - balance;

    res.json({
      ...users[0],
      credit_balance: balance,
      available_credit: available_credit > 0 ? available_credit : 0
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

