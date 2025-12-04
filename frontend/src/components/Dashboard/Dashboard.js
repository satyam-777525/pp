import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useSelector(state => state.auth);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
    creditBalance: 0
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchStats();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const ordersResponse = await api.get('/api/orders/my-orders');
      const orders = ordersResponse.data;

      const totalSpent = orders.reduce(
        (sum, o) => sum + parseFloat(o.total_amount || 0),
        0
      );

      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        totalSpent: totalSpent,
        creditBalance: Number(profile?.credit_balance || 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (!profile) {
    return <div className="container">Loading...</div>;
  }

  // Helper function to safely render numbers with 2 decimals
  const formatNumber = (value) => Number(value || 0).toFixed(2);

  return (
    <div className="container main-content">
      <h1>Dashboard</h1>
      <div className="dashboard-grid">

        <div className="dashboard-card">
          <h3>Account Status</h3>
          <p className={profile.status === 'approved' ? 'status-approved' : 'status-pending'}>
            {profile.status.toUpperCase()}
          </p>
          {profile.status === 'pending' && (
            <p className="status-message">Waiting for admin approval</p>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Credit Information</h3>
          <p>Credit Limit: ${formatNumber(profile.credit_limit)}</p>
          <p>Available Credit: ${formatNumber(profile.available_credit)}</p>
          <p>Balance: ${formatNumber(profile.credit_balance)}</p>
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <Link to="/catalog" className="btn btn-primary">Browse Catalog</Link>
          <Link
            to="/orders"
            className="btn btn-secondary"
            style={{ marginTop: '10px', display: 'block' }}
          >
            View Orders
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>Statistics</h3>
          <p>Total Orders: {stats.totalOrders}</p>
          <p>Pending Orders: {stats.pendingOrders}</p>
          <p>Total Spent: ${formatNumber(stats.totalSpent)}</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
