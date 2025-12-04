const express = require('express');
const db = require('../config/database');
const { authenticate, isAdmin, isRetailer } = require('../middleware/auth');
const router = express.Router();

// Create order
router.post('/', authenticate, isRetailer, async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const { items, payment_terms, notes } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items required' });
    }

    // Check credit limit if using credit
    if (payment_terms !== 'pay_now') {
      const [users] = await connection.query(
        'SELECT credit_limit FROM users WHERE id = ?',
        [userId]
      );

      const [credit] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total_owed
         FROM credit_transactions
         WHERE user_id = ? AND transaction_type = 'credit_purchase'`,
        [userId]
      );

      const [payments] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM credit_transactions
         WHERE user_id = ? AND transaction_type = 'payment'`,
        [userId]
      );

      const balance = parseFloat(credit[0].total_owed) - parseFloat(payments[0].total_paid);
      const availableCredit = users[0].credit_limit - balance;

      // Calculate order total
      let orderTotal = 0;
      for (const item of items) {
        const [products] = await connection.query('SELECT base_price FROM products WHERE id = ?', [item.product_id]);
        if (products.length > 0) {
          const [tiers] = await connection.query(
            `SELECT price FROM pricing_tiers 
             WHERE product_id = ? AND min_quantity <= ? 
             AND (max_quantity IS NULL OR max_quantity >= ?)
             ORDER BY min_quantity DESC LIMIT 1`,
            [item.product_id, item.quantity, item.quantity]
          );
          const price = tiers.length > 0 ? parseFloat(tiers[0].price) : parseFloat(products[0].base_price);
          orderTotal += price * item.quantity;
        }
      }

      if (orderTotal > availableCredit) {
        await connection.rollback();
        return res.status(400).json({ 
          message: 'Credit limit exceeded',
          available_credit: availableCredit,
          order_total: orderTotal
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await connection.query(
        'SELECT id, sku, name, base_price, moq FROM products WHERE id = ?',
        [item.product_id]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: `Product ${item.product_id} not found` });
      }

      const product = products[0];

      if (item.quantity < product.moq) {
        await connection.rollback();
        return res.status(400).json({ 
          message: `Product ${product.sku} requires minimum ${product.moq} units` 
        });
      }

      // Get pricing tier
      const [tiers] = await connection.query(
        `SELECT * FROM pricing_tiers 
         WHERE product_id = ? AND min_quantity <= ? 
         AND (max_quantity IS NULL OR max_quantity >= ?)
         ORDER BY min_quantity DESC LIMIT 1`,
        [item.product_id, item.quantity, item.quantity]
      );

      const unitPrice = tiers.length > 0 
        ? parseFloat(tiers[0].price) 
        : parseFloat(product.base_price);
      
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        tier_applied: tiers.length > 0 ? tiers[0].id : null,
        subtotal: itemSubtotal
      });
    }

    const taxAmount = 0; // Can be calculated
    const shippingAmount = 0; // Can be calculated
    const totalAmount = subtotal + taxAmount + shippingAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${userId}`;

    // Create order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (order_number, user_id, payment_terms, subtotal, tax_amount, shipping_amount, total_amount, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [orderNumber, userId, payment_terms || 'pay_now', subtotal, taxAmount, shippingAmount, totalAmount, notes || null]
    );

    const orderId = orderResult.insertId;

    // Create order items
    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price, tier_applied, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.sku, item.name, item.quantity, item.unit_price, item.tier_applied, item.subtotal]
      );
    }

    // If credit purchase, record transaction
    if (payment_terms !== 'pay_now') {
      const [credit] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total_owed
         FROM credit_transactions
         WHERE user_id = ? AND transaction_type = 'credit_purchase'`,
        [userId]
      );

      const [payments] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total_paid
         FROM credit_transactions
         WHERE user_id = ? AND transaction_type = 'payment'`,
        [userId]
      );

      const balanceAfter = parseFloat(credit[0].total_owed) + parseFloat(payments[0].total_paid) + totalAmount;

      await connection.query(
        `INSERT INTO credit_transactions (user_id, order_id, transaction_type, amount, balance_after, description)
         VALUES (?, ?, 'credit_purchase', ?, ?, ?)`,
        [userId, orderId, totalAmount, balanceAfter, `Order ${orderNumber}`]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Order created successfully',
      order_id: orderId,
      order_number: orderNumber
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get user orders
router.get('/my-orders', authenticate, isRetailer, async (req, res) => {
  try {
    const [orders] = await db.pool.query(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (admin)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const [orders] = await db.pool.query(
      `SELECT o.*, u.business_name, u.email,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );

    res.json(orders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check access
    const [orders] = await db.pool.query(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role !== 'admin' && orders[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    // Get user info if admin
    let userInfo = null;
    if (req.user.role === 'admin') {
      const [users] = await db.pool.query(
        'SELECT id, email, business_name, contact_person, phone, address FROM users WHERE id = ?',
        [order.user_id]
      );
      userInfo = users[0];
    }

    res.json({
      ...order,
      items,
      user: userInfo
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (admin)
router.patch('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    res.json({ message: 'Order status updated' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Quick reorder (get last order items)
router.get('/reorder/last', authenticate, isRetailer, async (req, res) => {
  try {
    const [orders] = await db.pool.query(
      `SELECT id FROM orders 
       WHERE user_id = ? AND status != 'cancelled'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'No previous orders found' });
    }

    const [items] = await db.pool.query(
      `SELECT oi.product_id, oi.quantity, p.sku, p.name, p.moq, p.base_price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orders[0].id]
    );

    res.json(items);
  } catch (error) {
    console.error('Get reorder items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

