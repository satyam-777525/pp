import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import './Admin.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      alert('Order status updated');
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating order status');
    }
  };

  const handleGenerateInvoice = async (orderId) => {
    try {
      const response = await api.post(`/api/invoices/generate/${orderId}`);
      const pdfData = response.data.pdf;
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = `${response.data.invoice_number}.pdf`;
      link.click();
      alert('Invoice generated successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Error generating invoice');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      approved: '#17a2b8',
      processing: '#007bff',
      shipped: '#6c757d',
      delivered: '#28a745',
      cancelled: '#dc3545'
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return <div className="container main-content">Loading orders...</div>;
  }

  return (
    <div className="container main-content">
      <h1>Order Management</h1>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Payment Terms</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.business_name}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>{order.item_count}</td>
                  <td>${parseFloat(order.total_amount).toFixed(2)}</td>
                  <td>{order.payment_terms.replace('_', ' ').toUpperCase()}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        backgroundColor: getStatusColor(order.status),
                        color: 'white'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className="btn btn-primary btn-sm">
                      View
                    </Link>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleGenerateInvoice(order.id)}
                      style={{ marginLeft: '5px' }}
                    >
                      Invoice
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderManagement;

