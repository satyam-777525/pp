# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Database

1. Make sure MySQL is running on your system
2. Update `backend/.env` with your database credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=wholesale_db
   ```

### 3. Start the Application

From the root directory:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

The database will be automatically created and initialized on first run.

### 4. Login

**Admin Account:**
- Email: `admin@wholesale.com`
- Password: `admin123`

**Retailer Account:**
- Register a new account (status will be "pending")
- Admin must approve the account before you can login

## Testing the System

### As Admin:
1. Login with admin credentials
2. Go to "Users" to approve pending retailer accounts
3. Go to "Products" to add products with pricing tiers
4. Go to "Orders" to view and process orders
5. Generate invoices for orders

### As Retailer:
1. Register a new account
2. Wait for admin approval (or approve yourself if you're admin)
3. Login and browse the catalog
4. Add products to cart (respecting MOQ)
5. Checkout with payment terms (Pay Now or Credit)
6. View orders and invoices
7. Use "Quick Reorder" to repeat previous orders
8. Upload CSV for bulk ordering

## CSV Format for Bulk Upload

Create a CSV file with the following format:
```csv
SKU,Quantity
PROD001,50
PROD002,100
PROD003,25
```

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `backend/.env`
- Ensure MySQL user has CREATE DATABASE privileges

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Set `PORT` environment variable before running `npm start`

### Module Not Found
- Run `npm install` in the respective directory (backend or frontend)
- Delete `node_modules` and `package-lock.json`, then reinstall

## Production Build

### Frontend
```bash
cd frontend
npm run build
```

The `build` folder contains the production-ready React app.

### Backend
```bash
cd backend
npm start
```

Make sure to:
- Set `NODE_ENV=production`
- Use a secure `JWT_SECRET`
- Configure proper database credentials
- Set up proper CORS settings

