import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import './Admin.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    pendingUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        api.get('/api/users/pending'),
        api.get('/api/orders')
      ]);

      const pendingUsers = usersRes.data.length;
      const orders = ordersRes.data;
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

      setStats({
        pendingUsers,
        totalOrders,
        pendingOrders,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="container main-content">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-grid">
        <Link to="/admin/users" className="dashboard-card card-link">
          <h3>Pending Users</h3>
          <p className="stat-number">{stats.pendingUsers}</p>
          <p className="stat-label">Awaiting approval</p>
        </Link>
        <Link to="/admin/orders" className="dashboard-card card-link">
          <h3>Total Orders</h3>
          <p className="stat-number">{stats.totalOrders}</p>
          <p className="stat-label">All time</p>
        </Link>
        <div className="dashboard-card">
          <h3>Pending Orders</h3>
          <p className="stat-number">{stats.pendingOrders}</p>
          <p className="stat-label">Require action</p>
        </div>
        <div className="dashboard-card">
          <h3>Total Revenue</h3>
          <p className="stat-number">${stats.totalRevenue.toFixed(2)}</p>
          <p className="stat-label">All time</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

