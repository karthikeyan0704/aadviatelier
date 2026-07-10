export const formatOrderId = (orderId) => {
  if (!orderId) return '';
  const parts = orderId.split('-');
  
  if (parts.length === 3) {
    const datePart = parts[1]; // e.g., '20260710'
    const seqPart = parts[2]; // e.g., '0001'
    
    if (datePart.length === 8) {
      const day = datePart.substring(6, 8);
      const month = datePart.substring(4, 6);
      return `${day}/${month}-${seqPart}`; // e.g., '10/07-0001'
    }
    
    return seqPart;
  }
  
  return orderId;
};
