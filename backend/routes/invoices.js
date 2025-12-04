const express = require('express');
const db = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');
const { jsPDF } = require('jspdf');
const router = express.Router();

// Generate invoice for order
router.post('/generate/:orderId', authenticate, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order
    const [orders] = await db.pool.query(
      `SELECT o.*, u.business_name, u.email, u.contact_person, u.phone, u.address, u.gst_tax_id
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    // Check if invoice already exists
    const [existing] = await db.pool.query(
      'SELECT id, invoice_number FROM invoices WHERE order_id = ?',
      [orderId]
    );

    let invoiceNumber;
    let invoiceId;

    if (existing.length > 0) {
      invoiceNumber = existing[0].invoice_number;
      invoiceId = existing[0].id;
    } else {
      // Generate invoice number
      invoiceNumber = `INV-${Date.now()}-${orderId}`;
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30); // Net 30

      // Create invoice record
      const [result] = await db.pool.query(
        `INSERT INTO invoices (invoice_number, order_id, user_id, issue_date, due_date, 
                              subtotal, tax_amount, shipping_amount, total_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [invoiceNumber, orderId, order.user_id, issueDate, dueDate, 
         order.subtotal, order.tax_amount, order.shipping_amount, order.total_amount]
      );

      invoiceId = result.insertId;
    }

    // Generate PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 20, 20);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceNumber}`, 20, 30);
    doc.text(`Order #: ${order.order_number}`, 20, 35);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 40);
    doc.text(`Due Date: ${new Date().toLocaleDateString()}`, 20, 45);

    // Company info
    doc.setFontSize(12);
    doc.text('From:', 20, 60);
    doc.setFontSize(10);
    doc.text('Wholesale Company', 20, 67);
    doc.text('123 Business Street', 20, 72);
    doc.text('City, State 12345', 20, 77);
    doc.text('GST: GST123456789', 20, 82);

    // Bill To
    doc.setFontSize(12);
    doc.text('Bill To:', 120, 60);
    doc.setFontSize(10);
    doc.text(order.business_name, 120, 67);
    doc.text(order.address || '', 120, 72);
    doc.text(`Contact: ${order.contact_person}`, 120, 77);
    doc.text(`GST: ${order.gst_tax_id || 'N/A'}`, 120, 82);

    // Items table
    let yPos = 100;
    doc.setFontSize(10);
    doc.text('Item', 20, yPos);
    doc.text('SKU', 50, yPos);
    doc.text('Qty', 90, yPos);
    doc.text('Unit Price', 110, yPos);
    doc.text('Total', 160, yPos);
    
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 5;

    for (const item of items) {
      doc.text(item.product_name.substring(0, 20), 20, yPos);
      doc.text(item.sku, 50, yPos);
      doc.text(item.quantity.toString(), 90, yPos);
      doc.text(`$${item.unit_price.toFixed(2)}`, 110, yPos);
      doc.text(`$${item.subtotal.toFixed(2)}`, 160, yPos);
      yPos += 7;
    }

    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Totals
    doc.text(`Subtotal: $${order.subtotal.toFixed(2)}`, 130, yPos);
    yPos += 7;
    doc.text(`Tax: $${order.tax_amount.toFixed(2)}`, 130, yPos);
    yPos += 7;
    doc.text(`Shipping: $${order.shipping_amount.toFixed(2)}`, 130, yPos);
    yPos += 7;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: $${order.total_amount.toFixed(2)}`, 130, yPos);
    yPos += 10;

    // Payment terms
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Payment Terms: ${order.payment_terms.replace('_', ' ').toUpperCase()}`, 20, yPos);
    yPos += 7;
    if (order.notes) {
      doc.text(`Notes: ${order.notes}`, 20, yPos);
    }

    // Convert to base64
    const pdfOutput = doc.output('datauristring');

    // Update invoice with PDF path (storing as base64 in DB for simplicity)
    await db.pool.query(
      'UPDATE invoices SET pdf_path = ? WHERE id = ?',
      [pdfOutput, invoiceId]
    );

    res.json({
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      pdf: pdfOutput,
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get invoice
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await db.pool.query(
      `SELECT i.*, o.order_number, u.business_name
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check access
    if (req.user.role !== 'admin' && invoices[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(invoices[0]);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user invoices
router.get('/my-invoices', authenticate, async (req, res) => {
  try {
    const [invoices] = await db.pool.query(
      `SELECT i.*, o.order_number
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );

    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk upload CSV for cart
router.post('/bulk-upload', authenticate, async (req, res) => {
  try {
    // This would typically use multer to handle file upload
    // For now, we'll accept CSV data in the request body
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ message: 'CSV data required' });
    }

    // Parse CSV (simple parsing - in production use a proper CSV parser)
    const lines = csvData.split('\n');
    const items = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;

      const [sku, quantity] = line.split(',').map(s => s.trim());
      if (!sku || !quantity) continue;

      // Find product by SKU
      const [products] = await db.pool.query(
        'SELECT id FROM products WHERE sku = ?',
        [sku]
      );

      if (products.length > 0) {
        items.push({
          product_id: products[0].id,
          sku: sku,
          quantity: parseInt(quantity) || 1
        });
      }
    }

    res.json({
      message: 'CSV processed',
      items: items,
      count: items.length
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

