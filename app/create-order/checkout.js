import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Trash2, Pencil, MessageCircle, FileText } from 'lucide-react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';
import CustomAlert from '../../components/CustomAlert';
import SuccessModal from '../../components/SuccessModal';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function Checkout() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart, customerId } = useCart();
  const { token } = useAuth();
  
  const [advancePaid, setAdvancePaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, whatsappLink: '', customer: null, orderItems: [], grandTotal: 0, advancePaid: 0 });

  const showAlert = (type, title, message) => setCustomAlert({ visible: true, type, title, message });
  const dismissAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      showAlert('warning', 'Empty Cart', 'Please add items to your order first.');
      return;
    }

    setLoading(true);
    try {
      let totalAdvance = parseFloat(advancePaid) || 0;
      let advanceRemaining = totalAdvance;

      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const itemAdvance = Math.min(item.total, advanceRemaining);
        advanceRemaining -= itemAdvance;

        const formData = new FormData();
        formData.append('customerId', item.customerId);
        formData.append('category', item.category);
        formData.append('dressType', item.dressType);
        formData.append('type', item.orderInfo.type);
        formData.append('specialInstructions', item.orderInfo.specialInstructions);
        formData.append('deliveryDate', new Date(item.orderInfo.deliveryDate).toISOString());
        
        if (item.orderInfo.trialDate) {
          formData.append('trialDate', new Date(item.orderInfo.trialDate).toISOString());
        }
        
        formData.append('priority', item.orderInfo.priority);
        formData.append('isAariWork', String(item.orderInfo.isAariWork));
        formData.append('quantity', item.orderInfo.quantity.toString());
        formData.append('stitchingPrice', item.orderInfo.stitchingPrice || '0');
        formData.append('additionalCosts', item.orderInfo.extraCharge || '0');
        formData.append('description', item.orderInfo.extraChargeReason || '');
        if (item.orderInfo.extraCharges && item.orderInfo.extraCharges.length > 0) {
          const formattedExtra = item.orderInfo.extraCharges.filter(ec => parseFloat(ec.amount) > 0).map(ec => ({ description: ec.reason || 'Extra Charge', amount: parseFloat(ec.amount) }));
          formData.append('extraCharges', JSON.stringify(formattedExtra));
        }
        
        formData.append('measurements', JSON.stringify({ ...item.measurements, dressType: item.dressType }));
        if (item.assignedTo.cuttingMaster || item.assignedTo.stitchingMaster) {
          formData.append('assignedTo', JSON.stringify(item.assignedTo));
        }
        
        formData.append('billing', JSON.stringify({
          estimatedCost: item.total,
          advancePaid: itemAdvance
        }));

        if (item.refImages && item.refImages.length > 0) {
          item.refImages.forEach((img, idx) => {
            formData.append('referenceImages', {
              uri: img.uri,
              type: 'image/jpeg',
              name: `ref_image_${idx}.jpg`,
            });
          });
        }

        if (item.sampleDressImages && item.sampleDressImages.length > 0) {
          item.sampleDressImages.forEach((img, idx) => {
            formData.append('sampleDressPhotos', {
              uri: img.uri,
              type: 'image/jpeg',
              name: `sample_dress_${idx}.jpg`,
            });
          });
        }

        if (item.audioUri) {
          const uriParts = item.audioUri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          formData.append('audioInstruction', {
            uri: item.audioUri,
            type: `audio/${fileType}`,
            name: `audio_instruction.${fileType}`,
          });
        }

        const response = await fetch(API_ENDPOINTS.ORDERS, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server Error: ${errorText}`);
        }

        // Save legacy measurements
        if (!item.useExisting && Object.keys(item.measurements).length > 0) {
          try {
            const res = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${item.customerId}`);
            const cust = res.data.customer;
            let currentArray = cust?.measurements?.[item.dressType] || [];
            if (!Array.isArray(currentArray)) {
              currentArray = Object.keys(currentArray).length > 0 
                ? [{ id: Date.now().toString(), title: 'Legacy', date: new Date().toISOString(), details: currentArray }]
                : [];
            }
            
            currentArray.unshift({
              id: Date.now().toString(),
              title: `Order Measurement`,
              date: new Date().toISOString(),
              details: item.measurements
            });

            await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${item.customerId}/measurements`, {
              outfitName: item.dressType,
              measurements: currentArray
            });
          } catch (err) {
            console.log('Failed to save measurement', err);
          }
        }
      }

      // Generate Master WhatsApp Invoice
      const custRes = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
      const customer = custRes.data.customer;
      
      let itemsList = cart.map((item, index) => `${index + 1}. ${item.category} - ${item.dressType} (₹${item.total})`).join('\n');
      
      const message = `*Aadvi Designer Studio*\n🧾 *MASTER INVOICE*\n\n*Customer:* ${customer.name}\n\n*Items Ordered:*\n${itemsList}\n\n*Billing Summary:*\nGrand Total: ₹${grandTotal}\nAdvance Paid: ₹${totalAdvance}\n*Balance Due:* ₹${grandTotal - totalAdvance}\n\nThank you for choosing Aadvi Designer Studio! 🙏`;
      
      const encodedMessage = encodeURIComponent(message);
      const link = `https://wa.me/91${customer.mobileNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
      
      const orderItemsCopy = [...cart];
      
      clearCart();
      setSuccessModal({ 
        visible: true, 
        whatsappLink: link, 
        customer, 
        orderItems: orderItemsCopy, 
        grandTotal, 
        advancePaid: totalAdvance 
      });

    } catch (error) {
      console.error('Checkout Error:', error);
      showAlert('error', 'Checkout Failed', 'Failed to create orders.');
    } finally {
      setLoading(false);
    }
  };

  const generateMasterPDF = async () => {
    try {
      const { customer, orderItems, grandTotal, advancePaid } = successModal;
      if (!customer || !orderItems || orderItems.length === 0) return;

      const date = new Date().toLocaleDateString('en-GB');
      const balanceDue = Math.max(grandTotal - advancePaid, 0);
      
      let qrCodeHtml = '';
      if (balanceDue > 0) {
        // IMPORTANT: Update this UPI ID to your actual business UPI ID
        const upiId = 'sathyaatamilselvan-1@oksbi'; 
        const upiName = 'Sathyaa Tamilselvan';
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${balanceDue}&cu=INR`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;
        
        qrCodeHtml = `
          <div style="margin-top: 30px; float: left; text-align: center; border: 1px dashed #5959be; padding: 15px; border-radius: 8px; background-color: #fcfcff;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #5959be;">Scan to Pay Balance</p>
            <img src="${qrUrl}" width="120" height="120" alt="UPI QR Code" />
            <p style="margin: 8px 0 8px 0; font-size: 15px; font-weight: bold;">₹${balanceDue.toLocaleString('en-IN')}</p>
            <div style="display: flex; justify-content: center; gap: 10px; align-items: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/120px-Google_Pay_Logo.svg.png" height="14" alt="GPay" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/120px-PhonePe_Logo.svg.png" height="16" alt="PhonePe" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/120px-Paytm_Logo_%28standalone%29.svg.png" height="10" alt="Paytm" />
            </div>
          </div>
        `;
      }
      
      let itemsHtml = orderItems.map((item, idx) => {
        let extraHtml = '';
        if (parseFloat(item.orderInfo.extraCharge) > 0) {
          extraHtml += `<br/><small style="color: #555">+ Extra Charge (${item.orderInfo.extraChargeReason || 'Other'}): ₹${item.orderInfo.extraCharge}</small>`;
        }
        if (item.orderInfo.extraCharges && item.orderInfo.extraCharges.length > 0) {
          extraHtml += item.orderInfo.extraCharges.map(ec => {
            if (parseFloat(ec.amount) > 0) {
              return `<br/><small style="color: #555">+ Extra Charge (${ec.reason || 'Other'}): ₹${ec.amount}</small>`;
            }
            return '';
          }).join('');
        }
        return `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.category} - ${item.dressType}<br/><small style="color: #777">${(item.orderInfo.specialInstructions || '').replace(/\n/g, '<br/>')}</small>${extraHtml}</td>
          <td>${item.orderInfo.quantity || 1}</td>
          <td>₹${item.orderInfo.stitchingPrice || 0}</td>
          <td style="text-align: right;">₹${item.total}</td>
        </tr>
      `}).join('');
      
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #5959be; padding-bottom: 20px; }
              h1 { color: #5959be; margin: 0; font-size: 32px; }
              .title { font-size: 20px; font-weight: bold; color: #666; margin-top: 10px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .label { font-weight: bold; color: #555; }
              .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
              .table th, .table td { padding: 15px; border-bottom: 1px solid #ddd; text-align: left; }
              .table th { background-color: #f8f9fa; color: #5959be; }
              .total-section { margin-top: 30px; float: right; width: 300px; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; }
              .total-row.bold { font-weight: bold; font-size: 18px; color: #5959be; border-top: 2px solid #5959be; padding-top: 10px; }
              .footer { margin-top: 100px; text-align: center; font-size: 12px; color: #888; clear: both; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Aadvi Designer Studio</h1>
              <div class="title">MASTER INVOICE</div>
            </div>
            
            <div class="row">
              <div><span class="label">Date:</span> ${date}</div>
            </div>
            
            <div class="row">
              <div><span class="label">Customer:</span> ${customer.name}</div>
              <div><span class="label">Phone:</span> ${customer.mobileNumber}</div>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div>
              ${qrCodeHtml}
              <div class="total-section">
                <div class="total-row"><span>Total Amount:</span> <span>₹${grandTotal.toLocaleString('en-IN')}</span></div>
                <div class="total-row"><span>Paid Amount:</span> <span>₹${advancePaid.toLocaleString('en-IN')}</span></div>
                <div class="total-row bold"><span>Balance Due:</span> <span>₹${balanceDue.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
            
            <div class="footer">
              Thank you for choosing Aadvi Designer Studio!<br/>
              For queries, please contact us.
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      const safeName = customer.name ? customer.name.replace(/[^a-z0-9]/gi, '_') : 'Customer';
      const timestamp = new Date().getTime();
      const newPath = `${FileSystem.documentDirectory}Aadvi_Master_Bill_${safeName}_${timestamp}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: newPath });
      await Sharing.shareAsync(newPath, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Master Invoice' });
    } catch (e) {
      console.log(e);
      showAlert('error', 'Error', 'Failed to generate PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemName}>{item.category} - {item.dressType}</Text>
                  <Text style={styles.itemDetail}>Qty: {item.orderInfo.quantity}  |  ₹{item.total}</Text>
                </View>
                <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
                  <TouchableOpacity onPress={() => {
                    router.push({
                      pathname: '/create-order/details',
                      params: { 
                        customerId: item.customerId, 
                        category: item.category, 
                        dressType: item.dressType,
                        editIndex: index
                      }
                    });
                  }}>
                    <Pencil size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeFromCart(index)}>
                    <Trash2 size={20} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {cart.length === 0 && (
              <Text style={{color: Colors.textSecondary, fontStyle: 'italic', marginVertical: 10}}>Cart is empty</Text>
            )}
          </View>

          <View style={[styles.section, {backgroundColor: '#F8F9FA'}]}>
            <Text style={styles.sectionTitle}>Billing Summary</Text>
            
            <View style={[styles.breakupRow, {marginTop: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 12}]}>
              <Text style={[styles.breakupText, {fontWeight: 'bold', fontSize: 16}]}>Grand Total:</Text>
              <Text style={[styles.breakupText, {fontWeight: 'bold', color: Colors.primary, fontSize: 16}]}>₹ {grandTotal}</Text>
            </View>

            <View style={[styles.breakupRow, {marginTop: 12}]}>
              <Text style={styles.breakupText}>Total Advance Paid</Text>
              <TextInput 
                style={[styles.priceInput, {width: 100, height: 40, fontSize: 16}]} 
                placeholder="0" 
                keyboardType="numeric" 
                value={advancePaid}
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9.]/g, '');
                  const num = parseFloat(cleaned);
                  if (!isNaN(num) && grandTotal > 0 && num > grandTotal) {
                    setAdvancePaid(String(grandTotal));
                    showAlert('warning', 'Amount Capped', `Advance cannot exceed total amount ₹${grandTotal}`);
                  } else {
                    setAdvancePaid(cleaned);
                  }
                }}
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.breakupRow, {marginTop: 8}]}>
              <Text style={[styles.breakupText, {fontWeight: 'bold'}]}>Balance Due</Text>
              <Text style={[styles.breakupText, {fontWeight: 'bold', color: Colors.error}]}>₹ {Math.max(grandTotal - (parseFloat(advancePaid) || 0), 0)}</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, loading && styles.disabled]} onPress={handleSubmit} disabled={loading || cart.length === 0}>
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Text style={styles.submitText}>Confirm Order</Text>
                <CheckCircle2 size={20} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        onDismiss={dismissAlert}
      />
      
      <SuccessModal
        visible={successModal.visible}
        title="Order Confirmed!"
        message="The orders have been successfully saved."
        secondaryText="Send WhatsApp Invoice"
        secondaryIcon={<MessageCircle size={20} color="#fff" />}
        onSecondaryAction={async () => {
          if (successModal.whatsappLink) {
            try {
              if (await Linking.canOpenURL(successModal.whatsappLink)) {
                await Linking.openURL(successModal.whatsappLink);
              }
            } catch (err) {
              console.log(err);
            }
          }
        }}
        tertiaryText="Share Master PDF Invoice"
        tertiaryIcon={<FileText size={20} color={Colors.primary} />}
        onTertiaryAction={generateMasterPDF}
        onDone={() => {
          setSuccessModal({ visible: false, whatsappLink: '', customer: null, orderItems: [], grandTotal: 0, advancePaid: 0 });
          router.dismissAll();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: Spacing.lg, 
    backgroundColor: Colors.primary, 
    ...Shadows.sm,
    paddingBottom: Spacing.xl,
    borderRadius: 20,
    marginHorizontal: 10,
    marginTop: 20,
    marginBottom: 20
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  section: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  
  cartItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  itemDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  priceInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 6, width: 100, textAlign: 'center', fontSize: 14, backgroundColor: Colors.white },
  breakupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakupText: { fontSize: 14, color: Colors.text },

  submitButton: { backgroundColor: Colors.primary, flexDirection: 'row', height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginRight: Spacing.sm },
  disabled: { opacity: 0.7 }
});
