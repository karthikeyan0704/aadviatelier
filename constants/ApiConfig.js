const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://aadvi-atelier-server.vercel.app/api'; 

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REFRESH: `${API_BASE_URL}/auth/refresh`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  CUSTOMERS: `${API_BASE_URL}/customers`,
  ORDERS: `${API_BASE_URL}/orders`,
  DASHBOARD: `${API_BASE_URL}/orders/dashboard`,
  STAFF: `${API_BASE_URL}/auth/staff`,
  PROFILE: `${API_BASE_URL}/auth/profile`,
  STAFF_ORDERS: `${API_BASE_URL}/orders/staff-orders`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`
};

export const getWhatsAppLink = (orderId) => `${API_BASE_URL}/orders/${orderId}/whatsapp`;
