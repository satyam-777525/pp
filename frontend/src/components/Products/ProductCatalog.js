import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addToCart } from '../../store/slices/cartSlice';
import api from '../../utils/api';
import './ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const dispatch = useDispatch();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data);
      // Initialize quantities with MOQ
      const initialQuantities = {};
      response.data.forEach(product => {
        initialQuantities[product.id] = product.moq || 1;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId, value) => {
    setQuantities({
      ...quantities,
      [productId]: parseInt(value) || 0
    });
  };

  const handleAddToCart = (product) => {
    const quantity = quantities[product.id] || product.moq;
    if (quantity < product.moq) {
      alert(`Minimum order quantity is ${product.moq} units`);
      return;
    }
    dispatch(addToCart({ product, quantity }));
    alert('Added to cart!');
  };

  const getPriceForQuantity = async (product, quantity) => {
    try {
      const response = await api.post('/api/pricing/calculate', {
        product_id: product.id,
        quantity: quantity
      });
      return response.data.unit_price;
    } catch (error) {
      return product.base_price;
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target.result;
      try {
        const response = await api.post('/api/invoices/bulk-upload', { csvData });
        // Add items to cart from CSV
        if (response.data.items && response.data.items.length > 0) {
          // Fetch product details and add to cart
          for (const item of response.data.items) {
            const productResponse = await api.get(`/api/products/${item.product_id}`);
            const product = productResponse.data;
            dispatch(addToCart({ 
              product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                base_price: product.base_price,
                moq: product.moq
              }, 
              quantity: item.quantity 
            }));
          }
          alert(`${response.data.items.length} items added to cart from CSV!`);
        }
      } catch (error) {
        console.error('Bulk upload error:', error);
        alert('Error processing CSV file');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return <div className="container main-content">Loading products...</div>;
  }

  return (
    <div className="container main-content">
      <div className="catalog-header">
        <h1>Product Catalog</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => document.getElementById('csv-upload').click()}
        >
          Bulk Upload CSV
        </button>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleCSVUpload}
        />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>MOQ</th>
              <th>Stock</th>
              <th>Base Price</th>
              <th>Quantity</th>
              <th>Unit Price</th>
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
                <td>
                  <input
                    type="number"
                    min={product.moq}
                    value={quantities[product.id] || product.moq}
                    onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                    style={{ width: '80px' }}
                  />
                </td>
                <td>
                  ${product.base_price}
                  {product.pricing_tiers && product.pricing_tiers.length > 0 && (
                    <span className="tier-indicator">*</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddToCart(product)}
                  >
                    Add to Cart
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

export default ProductCatalog;

