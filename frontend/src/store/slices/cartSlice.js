import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    totals: {
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0
    }
  },
  reducers: {
    addToCart: (state, action) => {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find(item => item.product_id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          quantity: quantity,
          unit_price: product.base_price,
          moq: product.moq
        });
      }
    },
    updateQuantity: (state, action) => {
      const { product_id, quantity } = action.payload;
      const item = state.items.find(item => item.product_id === product_id);
      if (item) {
        item.quantity = quantity;
      }
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.product_id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
      state.totals = {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0
      };
    },
    setTotals: (state, action) => {
      state.totals = action.payload;
    },
    loadCart: (state, action) => {
      state.items = action.payload;
    }
  }
});

export const { addToCart, updateQuantity, removeFromCart, clearCart, setTotals, loadCart } = cartSlice.actions;
export default cartSlice.reducer;

