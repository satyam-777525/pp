import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="navbar-brand">
          Wholesale Management
        </Link>
        <div className="navbar-menu">
          {user?.role === 'admin' ? (
            <>
              <Link to="/admin" className="navbar-link">Dashboard</Link>
              <Link to="/admin/users" className="navbar-link">Users</Link>
              <Link to="/admin/products" className="navbar-link">Products</Link>
              <Link to="/admin/orders" className="navbar-link">Orders</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="navbar-link">Dashboard</Link>
              <Link to="/catalog" className="navbar-link">Catalog</Link>
              <Link to="/cart" className="navbar-link">Cart</Link>
              <Link to="/orders" className="navbar-link">Orders</Link>
              <Link to="/invoices" className="navbar-link">Invoices</Link>
            </>
          )}
          <div className="navbar-user">
            <span>{user?.business_name || user?.email}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

