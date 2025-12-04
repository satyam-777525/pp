import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateQuantity, removeFromCart, setTotals, clearCart, addToCart } from '../../store/slices/cartSlice';
import api from '../../utils/api';
import './Cart.css';

const Cart = () => {
  const { items, totals } = useSelector(state => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [paymentTerms, setPaymentTerms] = useState('pay_now');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    calculateTotals();
  }, [items]);

  // Format numbers safely
  const formatNumber = (value) => {
    const number = Number(value);
    return isNaN(number) ? '0.00' : number.toFixed(2);
  };

  // Calculate totals and update unit prices
  const calculateTotals = async () => {
    if (items.length === 0) {
      dispatch(setTotals({ subtotal: 0, tax: 0, shipping: 0, total: 0 }));
      return;
    }

    try {
      const response = await api.post('/api/pricing/cart-total', {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity || 0)
        }))
      });

      console.log('Cart total API response:', response.data);

      // Handle API errors
      if (response.data.errors && response.data.errors.length > 0) {
        const errorMap = {};
        response.data.errors.forEach(err => {
          errorMap[err.product_id] = err.message;
        });
        setErrors(errorMap);
      } else {
        setErrors({});
      }

      // Update unit_price in items if provided by API
      if (response.data.items && response.data.items.length > 0) {
        response.data.items.forEach(apiItem => {
          const cartItem = items.find(i => i.product_id === apiItem.product_id);
          if (cartItem) {
            dispatch(updateQuantity({
              product_id: apiItem.product_id,
              quantity: cartItem.quantity,
              unit_price: Number(apiItem.unit_price || cartItem.unit_price || 0)
            }));
          }
        });
      }

      // Update totals in store
      const subtotal = Number(response.data.subtotal || 0);
      const tax = Number(response.data.tax_amount || 0);
      const shipping = Number(response.data.shipping_amount || 0);
      const total = Number(response.data.total || 0);

      dispatch(setTotals({ subtotal, tax, shipping, total }));

    } catch (error) {
      console.error('Error calculating totals:', error);
      dispatch(setTotals({ subtotal: 0, tax: 0, shipping: 0, total: 0 }));
    }
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    dispatch(updateQuantity({ product_id: productId, quantity: Number(newQuantity) }));
  };

  const handleRemove = (productId) => {
    if (window.confirm('Remove this item from cart?')) {
      dispatch(removeFromCart(productId));
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (Object.keys(errors).length > 0) {
      alert('Please fix errors before checkout');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/orders', {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity || 0)
        })),
        payment_terms: paymentTerms
      });

      dispatch(clearCart());
      alert('Order placed successfully!');
      navigate(`/orders/${response.data.order_id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Error placing order');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReorder = async () => {
    try {
      const response = await api.get('/api/orders/reorder/last');
      response.data.forEach(item => {
        dispatch(addToCart({
          product: {
            id: item.product_id,
            sku: item.sku,
            name: item.name,
            base_price: Number(item.base_price || 0),
            moq: item.moq
          },
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.base_price || 0) // Ensure unit_price exists
        }));
      });
      alert('Last order items added to cart!');
    } catch (error) {
      alert('No previous order found');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container main-content">
        <h1>Cart</h1>
        <div className="card">
          <p>Your cart is empty</p>
          <button className="btn btn-primary" onClick={() => navigate('/catalog')}>
            Browse Catalog
          </button>
          <button className="btn btn-secondary" onClick={handleQuickReorder} style={{ marginLeft: '10px' }}>
            Quick Reorder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container main-content">
      <h1>Shopping Cart</h1>
      <div className="cart-container">
        <div className="cart-items">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.product_id}>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td>
                      <input
                        type="number"
                        min={item.moq || 1}
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                        style={{ width: '80px' }}
                      />
                      {errors[item.product_id] && (
                        <div className="error-message">{errors[item.product_id]}</div>
                      )}
                    </td>
                    <td>${formatNumber(item.unit_price)}</td>
                    <td>${formatNumber((Number(item.unit_price || 0) * Number(item.quantity || 0)))}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(item.product_id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cart-summary">
          <div className="card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>${formatNumber(totals.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Tax:</span>
              <span>${formatNumber(totals.tax)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span>${formatNumber(totals.shipping)}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>${formatNumber(totals.total)}</span>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              >
                <option value="pay_now">Pay Now</option>
                <option value="credit_net_30">Credit / Net 30</option>
                <option value="credit_net_60">Credit / Net 60</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCheckout}
              disabled={loading || Object.keys(errors).length > 0}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? 'Processing...' : 'Checkout'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleQuickReorder}
              style={{ width: '100%', marginTop: '10px' }}
            >
              Quick Reorder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
