import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import './Admin.css';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'unit',
    stock_quantity: 0,
    moq: 1,
    base_price: 0,
    image_url: '',
    is_active: true,
    pricing_tiers: []
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, formData);
        if (formData.pricing_tiers.length > 0) {
          await api.put(`/api/products/${editingProduct.id}/pricing-tiers`, {
            pricing_tiers: formData.pricing_tiers
          });
        }
      } else {
        await api.post('/api/products', formData);
      }
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
      alert('Product saved successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving product');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: '',
      unit: 'unit',
      stock_quantity: 0,
      moq: 1,
      base_price: 0,
      image_url: '',
      is_active: true,
      pricing_tiers: []
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      unit: product.unit || 'unit',
      stock_quantity: product.stock_quantity,
      moq: product.moq,
      base_price: product.base_price,
      image_url: product.image_url || '',
      is_active: product.is_active,
      pricing_tiers: product.pricing_tiers || []
    });
    setShowForm(true);
  };

  const addPricingTier = () => {
    setFormData({
      ...formData,
      pricing_tiers: [
        ...formData.pricing_tiers,
        { min_quantity: 1, max_quantity: null, price: 0, discount_percentage: 0 }
      ]
    });
  };

  if (loading) {
    return <div className="container main-content">Loading products...</div>;
  }

  return (
    <div className="container main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Product Management</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingProduct(null); resetForm(); }}>
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>MOQ (Minimum Order Quantity)</label>
                <input
                  type="number"
                  value={formData.moq}
                  onChange={(e) => setFormData({ ...formData, moq: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Base Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
            </div>

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4>Pricing Tiers</h4>
                <button type="button" className="btn btn-secondary" onClick={addPricingTier}>
                  Add Tier
                </button>
              </div>
              {formData.pricing_tiers.map((tier, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="number"
                    placeholder="Min Qty"
                    value={tier.min_quantity}
                    onChange={(e) => {
                      const newTiers = [...formData.pricing_tiers];
                      newTiers[index].min_quantity = parseInt(e.target.value);
                      setFormData({ ...formData, pricing_tiers: newTiers });
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max Qty (optional)"
                    value={tier.max_quantity || ''}
                    onChange={(e) => {
                      const newTiers = [...formData.pricing_tiers];
                      newTiers[index].max_quantity = e.target.value ? parseInt(e.target.value) : null;
                      setFormData({ ...formData, pricing_tiers: newTiers });
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={tier.price}
                    onChange={(e) => {
                      const newTiers = [...formData.pricing_tiers];
                      newTiers[index].price = parseFloat(e.target.value);
                      setFormData({ ...formData, pricing_tiers: newTiers });
                    }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Discount %"
                    value={tier.discount_percentage}
                    onChange={(e) => {
                      const newTiers = [...formData.pricing_tiers];
                      newTiers[index].discount_percentage = parseFloat(e.target.value);
                      setFormData({ ...formData, pricing_tiers: newTiers });
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      const newTiers = formData.pricing_tiers.filter((_, i) => i !== index);
                      setFormData({ ...formData, pricing_tiers: newTiers });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Save Product</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); setEditingProduct(null); resetForm(); }}
                style={{ marginLeft: '10px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>MOQ</th>
              <th>Stock</th>
              <th>Base Price</th>
              <th>Tiers</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.category || '-'}</td>
                <td>{product.moq}</td>
                <td>{product.stock_quantity}</td>
                <td>${product.base_price}</td>
                <td>{product.pricing_tiers?.length || 0}</td>
                <td>{product.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEdit(product)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagement;

