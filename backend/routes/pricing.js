const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Calculate price for a quantity
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity required' });
    }

    // Get product
    const [products] = await db.pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = products[0];

    // Check MOQ
    if (quantity < product.moq) {
      return res.status(400).json({ 
        message: `Minimum order quantity is ${product.moq} units`,
        moq: product.moq
      });
    }

    // Get pricing tiers
    const [tiers] = await db.pool.query(
      `SELECT * FROM pricing_tiers 
       WHERE product_id = ? 
       AND min_quantity <= ?
       AND (max_quantity IS NULL OR max_quantity >= ?)
       ORDER BY min_quantity DESC
       LIMIT 1`,
      [product_id, quantity, quantity]
    );

    let unitPrice = product.base_price;
    let tierApplied = null;

    if (tiers.length > 0) {
      unitPrice = parseFloat(tiers[0].price);
      tierApplied = tiers[0].id;
    }

    const subtotal = unitPrice * quantity;

    res.json({
      product_id,
      quantity,
      unit_price: unitPrice,
      subtotal,
      tier_applied: tierApplied,
      moq: product.moq,
      moq_met: quantity >= product.moq
    });
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate cart total
router.post('/cart-total', authenticate, async (req, res) => {
  try {
    const { items } = req.body; // [{ product_id, quantity }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array required' });
    }

    let total = 0;
    const calculatedItems = [];
    const errors = [];

    for (const item of items) {
      const { product_id, quantity } = item;

      // Get product
      const [products] = await db.pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
      if (products.length === 0) {
        errors.push({ product_id, message: 'Product not found' });
        continue;
      }

      const product = products[0];

      // Check MOQ
      if (quantity < product.moq) {
        errors.push({ 
          product_id, 
          sku: product.sku,
          message: `Minimum order quantity is ${product.moq} units`,
          moq: product.moq
        });
        continue;
      }

      // Get pricing tier
      const [tiers] = await db.pool.query(
        `SELECT * FROM pricing_tiers 
         WHERE product_id = ? 
         AND min_quantity <= ?
         AND (max_quantity IS NULL OR max_quantity >= ?)
         ORDER BY min_quantity DESC
         LIMIT 1`,
        [product_id, quantity, quantity]
      );

      let unitPrice = parseFloat(product.base_price);
      let tierApplied = null;

      if (tiers.length > 0) {
        unitPrice = parseFloat(tiers[0].price);
        tierApplied = tiers[0].id;
      }

      const subtotal = unitPrice * quantity;
      total += subtotal;

      calculatedItems.push({
        product_id,
        sku: product.sku,
        name: product.name,
        quantity,
        unit_price: unitPrice,
        subtotal,
        tier_applied: tierApplied,
        moq: product.moq
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Some items have errors',
        errors,
        calculated_items: calculatedItems,
        subtotal: total
      });
    }

    res.json({
      items: calculatedItems,
      subtotal: total,
      tax_amount: 0, // Can be calculated based on location
      shipping_amount: 0, // Can be calculated based on order size
      total: total
    });
  } catch (error) {
    console.error('Calculate cart total error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

