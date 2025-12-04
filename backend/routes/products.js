const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get all products (only approved users can see)
router.get('/', authenticate, async (req, res) => {
  try {
    const [products] = await db.pool.query(
      `SELECT p.*, 
              (SELECT MIN(min_quantity) FROM pricing_tiers WHERE product_id = p.id) as tier_start
       FROM products p
       WHERE p.is_active = TRUE
       ORDER BY p.name`
    );

    // Get pricing tiers for each product
    for (let product of products) {
      const [tiers] = await db.pool.query(
        'SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY min_quantity',
        [product.id]
      );
      product.pricing_tiers = tiers;
    }

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await db.pool.query('SELECT * FROM products WHERE id = ?', [id]);

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const [tiers] = await db.pool.query(
      'SELECT * FROM pricing_tiers WHERE product_id = ? ORDER BY min_quantity',
      [id]
    );

    res.json({ ...products[0], pricing_tiers: tiers });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { sku, name, description, category, unit, stock_quantity, moq, base_price, image_url, pricing_tiers } = req.body;

    const [result] = await db.pool.query(
      `INSERT INTO products (sku, name, description, category, unit, stock_quantity, moq, base_price, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku, name, description || null, category || null, unit || 'unit', stock_quantity || 0, moq || 1, base_price, image_url || null]
    );

    const productId = result.insertId;

    // Add pricing tiers
    if (pricing_tiers && Array.isArray(pricing_tiers)) {
      for (const tier of pricing_tiers) {
        await db.pool.query(
          `INSERT INTO pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage)
           VALUES (?, ?, ?, ?, ?)`,
          [productId, tier.min_quantity, tier.max_quantity || null, tier.price, tier.discount_percentage || 0]
        );
      }
    }

    res.status(201).json({ message: 'Product created', productId });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'SKU already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product (admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { sku, name, description, category, unit, stock_quantity, moq, base_price, image_url, is_active } = req.body;

    await db.pool.query(
      `UPDATE products 
       SET sku = ?, name = ?, description = ?, category = ?, unit = ?, 
           stock_quantity = ?, moq = ?, base_price = ?, image_url = ?, is_active = ?
       WHERE id = ?`,
      [sku, name, description, category, unit, stock_quantity, moq, base_price, image_url, is_active !== undefined ? is_active : true, id]
    );

    res.json({ message: 'Product updated' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update pricing tiers (admin only)
router.put('/:id/pricing-tiers', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { pricing_tiers } = req.body;

    // Delete existing tiers
    await db.pool.query('DELETE FROM pricing_tiers WHERE product_id = ?', [id]);

    // Insert new tiers
    if (pricing_tiers && Array.isArray(pricing_tiers)) {
      for (const tier of pricing_tiers) {
        await db.pool.query(
          `INSERT INTO pricing_tiers (product_id, min_quantity, max_quantity, price, discount_percentage)
           VALUES (?, ?, ?, ?, ?)`,
          [id, tier.min_quantity, tier.max_quantity || null, tier.price, tier.discount_percentage || 0]
        );
      }
    }

    res.json({ message: 'Pricing tiers updated' });
  } catch (error) {
    console.error('Update pricing tiers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

