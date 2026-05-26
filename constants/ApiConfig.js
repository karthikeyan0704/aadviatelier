const API_BASE_URL = 'https://aadvi-atelier-server.vercel.app/api'; 
// const API_BASE_URL = 'http://10.103.27.17:5000/api'; 

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  CUSTOMERS: `${API_BASE_URL}/customers`,
  ORDERS: `${API_BASE_URL}/orders`,
  DASHBOARD: `${API_BASE_URL}/orders/dashboard`,
  STAFF: `${API_BASE_URL}/auth/staff`,
  PROFILE: `${API_BASE_URL}/auth/profile`,
  STAFF_ORDERS: `${API_BASE_URL}/orders/staff-orders`
};

export const getWhatsAppLink = (orderId) => `${API_BASE_URL}/orders/${orderId}/whatsapp`;
