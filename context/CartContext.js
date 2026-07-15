import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(null);

  const addToCart = (item) => {
    setCart((prev) => [...prev, item]);
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCart = (index, item) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart[index] = item;
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId(null);
  };

  return (
    <CartContext.Provider value={{ cart, customerId, setCustomerId, addToCart, removeFromCart, updateCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
