const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wholesale_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database and create tables
const initialize = async () => {
  try {
    // Create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'wholesale_db'}`);
    await connection.end();

    // Create tables
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

const createTables = async () => {
  const connection = await pool;

  // Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      gst_tax_id VARCHAR(100),
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      role ENUM('retailer', 'admin') DEFAULT 'retailer',
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      credit_limit DECIMAL(15, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Products table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      unit VARCHAR(50) DEFAULT 'unit',
      stock_quantity INT DEFAULT 0,
      moq INT DEFAULT 1,
      base_price DECIMAL(15, 2) NOT NULL,
      image_url VARCHAR(500),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Pricing tiers table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      min_quantity INT NOT NULL,
      max_quantity INT,
      price DECIMAL(15, 2) NOT NULL,
      discount_percentage DECIMAL(5, 2) DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_product_quantity (product_id, min_quantity)
    )
  `);

  // Orders table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      user_id INT NOT NULL,
      status ENUM('pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
      payment_terms ENUM('pay_now', 'credit_net_30', 'credit_net_60') DEFAULT 'pay_now',
      subtotal DECIMAL(15, 2) NOT NULL,
      tax_amount DECIMAL(15, 2) DEFAULT 0,
      shipping_amount DECIMAL(15, 2) DEFAULT 0,
      total_amount DECIMAL(15, 2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_status (user_id, status)
    )
  `);

  // Order items table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      sku VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(15, 2) NOT NULL,
      tier_applied INT,
      subtotal DECIMAL(15, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      INDEX idx_order (order_id)
    )
  `);

  // Invoices table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      order_id INT NOT NULL,
      user_id INT NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE,
      subtotal DECIMAL(15, 2) NOT NULL,
      tax_amount DECIMAL(15, 2) DEFAULT 0,
      shipping_amount DECIMAL(15, 2) DEFAULT 0,
      total_amount DECIMAL(15, 2) NOT NULL,
      status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
      pdf_path VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_status (user_id, status)
    )
  `);

  // Credit transactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      order_id INT,
      invoice_id INT,
      transaction_type ENUM('credit_purchase', 'payment', 'adjustment') NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      balance_after DECIMAL(15, 2) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      INDEX idx_user (user_id)
    )
  `);

  // Create default admin user (password: admin123)
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await connection.query(`
    INSERT IGNORE INTO users (email, password, business_name, role, status, credit_limit)
    VALUES ('admin@wholesale.com', ?, 'Wholesale Admin', 'admin', 'approved', 0)
  `, [hashedPassword]);

  console.log('Tables created successfully');
};

module.exports = {
  pool,
  initialize
};

