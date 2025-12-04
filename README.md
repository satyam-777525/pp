# B2B Wholesale Order Management System

A comprehensive B2B-focused commerce platform tailored for bulk purchasing, featuring tiered pricing, MOQ enforcement, credit management, and automated invoice generation.

## Features

### For Retailers (Buyers)
- **Registration & Approval**: Business registration with GST/Tax ID verification
- **Product Catalog**: Browse products with wholesale pricing and tiered pricing display
- **Bulk Ordering**: Add items to cart with MOQ enforcement
- **Tiered Pricing**: Automatic price calculation based on quantity
- **Credit System**: Purchase on credit with credit limit tracking
- **Quick Reorder**: Repeat previous month's inventory order instantly
- **Bulk CSV Upload**: Upload CSV file to fill cart instantly
- **Order Management**: Track order status and view order history
- **Invoice Management**: View and download invoices

### For Wholesalers (Admin)
- **User Management**: Approve/reject retailer accounts and set credit limits
- **Product Management**: Add/edit products with pricing tiers
- **Order Processing**: Review orders, update status, and generate invoices
- **Credit Management**: Set and manage credit limits for retailers
- **Invoice Generation**: Automated PDF invoice creation

## Tech Stack

- **Frontend**: React, Redux Toolkit, React Router
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **PDF Generation**: jsPDF
- **Authentication**: JWT

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd wholesale-order-management
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Configure backend**
```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

4. **Start MySQL and create database**
```bash
# MySQL will be created automatically on first run
```

5. **Start the application**
```bash
# From root directory
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

## Default Credentials

### Admin
- Email: `admin@wholesale.com`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new retailer
- `POST /api/auth/login` - Login

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)

### Pricing
- `POST /api/pricing/calculate` - Calculate price for quantity
- `POST /api/pricing/cart-total` - Calculate cart total with tiered pricing

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/reorder/last` - Get last order for quick reorder

### Invoices
- `POST /api/invoices/generate/:orderId` - Generate invoice (admin)
- `GET /api/invoices/my-invoices` - Get user invoices
- `POST /api/invoices/bulk-upload` - Bulk upload CSV

### Users (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/pending` - Get pending users
- `PATCH /api/users/:id/status` - Approve/reject user
- `PATCH /api/users/:id/credit-limit` - Update credit limit

## Database Schema

### Tables
- `users` - User accounts (retailers and admins)
- `products` - Product catalog
- `pricing_tiers` - Tiered pricing rules
- `orders` - Order records
- `order_items` - Order line items
- `invoices` - Invoice records
- `credit_transactions` - Credit purchase and payment tracking

## Key Features Implementation

### Tiered Pricing
The system automatically calculates prices based on quantity tiers. Pricing tiers are defined per product with min/max quantities and corresponding prices.

### MOQ Enforcement
Minimum Order Quantity (MOQ) is enforced at both cart and checkout levels. Users cannot add items below MOQ or complete checkout with invalid quantities.

### Credit System
- Credit limits are set per retailer by admin
- Credit purchases are tracked in `credit_transactions`
- Orders are blocked if credit limit is exceeded
- Balance is calculated as: Total Credit Purchases - Total Payments

### Invoice Generation
Invoices are generated as PDFs using jsPDF, including:
- Company and customer information
- Itemized order details
- Tax and shipping breakdown
- Payment terms
- Due dates

## Project Structure

```
wholesale-order-management/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── invoices.js
│   │   └── pricing.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Products/
│   │   │   ├── Cart/
│   │   │   ├── Orders/
│   │   │   ├── Invoices/
│   │   │   ├── Admin/
│   │   │   └── Layout/
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   └── store.js
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm start
```

## Production Build

### Frontend
```bash
cd frontend
npm run build
```

The build folder will contain the production-ready React app.

## License

ISC

## Contributing

This is a hackathon project. Contributions and improvements are welcome!

