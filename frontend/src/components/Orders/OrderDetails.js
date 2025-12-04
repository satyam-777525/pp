import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/api/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container main-content">Loading order details...</div>;
  }

  if (!order) {
    return <div className="container main-content">Order not found</div>;
  }

  return (
    <div className="container main-content">
      <h1>Order Details</h1>
      <div className="order-details">
        <div className="card">
          <h3>Order Information</h3>
          <div className="detail-row">
            <span>Order Number:</span>
            <span>{order.order_number}</span>
          </div>
          <div className="detail-row">
            <span>Status:</span>
            <span className="status-badge">{order.status.toUpperCase()}</span>
          </div>
          <div className="detail-row">
            <span>Date:</span>
            <span>{new Date(order.created_at).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span>Payment Terms:</span>
            <span>{order.payment_terms.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>

        <div className="card">
          <h3>Order Items</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.sku}</td>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td>${parseFloat(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Tax:</span>
            <span>${parseFloat(order.tax_amount).toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping:</span>
            <span>${parseFloat(order.shipping_amount).toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>${parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;

