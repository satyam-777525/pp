import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from './store/slices/authSlice';
import api from './utils/api';
import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import ProductCatalog from './components/Products/ProductCatalog';
import Cart from './components/Cart/Cart';
import Orders from './components/Orders/Orders';
import OrderDetails from './components/Orders/OrderDetails';
import Invoices from './components/Invoices/Invoices';
import AdminDashboard from './components/Admin/AdminDashboard';
import UserManagement from './components/Admin/UserManagement';
import ProductManagement from './components/Admin/ProductManagement';
import OrderManagement from './components/Admin/OrderManagement';
import './App.css';

function App() {
  const { user, isAuthenticated, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Load user data if token exists
    if (token && !user) {
      const loadUser = async () => {
        try {
          const response = await api.get('/api/users/profile');
          dispatch(setUser({
            id: response.data.id,
            email: response.data.email,
            role: response.data.role,
            business_name: response.data.business_name
          }));
        } catch (error) {
          console.error('Error loading user:', error);
        }
      };
      loadUser();
    }
  }, [token, user, dispatch]);

  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        
        {isAuthenticated ? (
          <>
            {user?.role === 'admin' ? (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/products" element={<ProductManagement />} />
                <Route path="/admin/orders" element={<OrderManagement />} />
                <Route path="/" element={<Navigate to="/admin" />} />
              </>
            ) : (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/catalog" element={<ProductCatalog />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetails />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </>
            )}
          </>
        ) : (
          <Route path="/" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </div>
  );
}

export default App;

