import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, Linking, Image,
  TextInput, Modal, RefreshControl, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Phone, MessageCircle, User, CheckCircle, Circle,
  Calendar, Scissors, Tag, CreditCard, ChevronDown, ChevronUp,
  Image as ImageIcon, FileText, Sparkles, Clock, Package, Trash2, Edit3, X, Square, Play
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Audio } from 'expo-av';
import SuccessModal from '../components/SuccessModal';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_COLORS = {
  'Pending': { bg: '#FFF3E0', text: '#E65100', border: '#FFB74D' },
  'In Progress': { bg: '#E3F2FD', text: '#1565C0', border: '#64B5F6' },
  'Ready': { bg: '#E8F5E9', text: '#2E7D32', border: '#81C784' },
  'Delivered': { bg: '#F3E5F5', text: '#6A1B9A', border: '#BA68C8' },
};

const WORKFLOW_ICONS = {
  'Order Received': Package, 'Fabric / Lining Sourcing': Tag,
  'Marking': FileText, 'Cutting': Scissors, 'Stitching': Scissors,
  'Aari Work / Embroidery': Sparkles, 'Checking': CheckCircle,
  'Hook and Hem': Scissors, 'Ironing': Package, 'Packing': Package,
  'Billing': CreditCard, 'Delivery': Package,
};

export default function OrderDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '', title: '' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, stepIndex: null, stepName: '' });
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [updatingStep, setUpdatingStep] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editBillModalVisible, setEditBillModalVisible] = useState(false);
  const [additionalCost, setAdditionalCost] = useState('');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [isEstimateInvoice, setIsEstimateInvoice] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignType, setAssignType] = useState(''); // 'cutting' or 'stitching'
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => { fetchOrderDetails(); fetchStaff(); }, [id]);

  useEffect(() => {
    return sound ? () => {
      sound.unloadAsync();
    } : undefined;
  }, [sound]);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.STAFF);
      setStaffList(res.data);
    } catch (e) {
      console.log('Failed to fetch staff', e);
    }
  };
  const playAudio = async (audioUri) => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      if (isAudioLoading) return;
      setIsAudioLoading(true);

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      setIsAudioLoading(false);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setAudioPosition(status.positionMillis || 0);
          setAudioDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setAudioPosition(0);
            newSound.pauseAsync().then(() => {
              newSound.setPositionAsync(0);
            });
          }
        }
      });
    } catch (err) {
      console.error('Failed to play audio', err);
      Alert.alert('Error', 'Failed to play audio');
    }
  };
  const fetchOrderDetails = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINTS.ORDERS}/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch order details");
    } finally { 
      setLoading(false); 
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrderDetails(true);
  }, [id]);

  const handleCall = () => {
    if (order?.customer?.mobileNumber) Linking.openURL(`tel:${order.customer.mobileNumber}`);
  };

  const handleWhatsApp = async () => {
    try {
      const res = await axios.get(`${API_ENDPOINTS.ORDERS}/${id}/whatsapp`);
      Linking.openURL(res.data.link);
    } catch { 
      if (order?.customer?.mobileNumber) {
        Linking.openURL(`whatsapp://send?phone=91${order.customer.mobileNumber}`);
      }
    }
  };

  const handleWorkflowUpdate = async (stepIndex) => {
    const step = order.workflow[stepIndex];
    if (step.status === 'Completed') return;
    
    if (step.step === 'Delivery' && order.billing?.paymentStatus !== 'Paid') {
      Alert.alert('Payment Pending', 'Please record full payment before marking the order as Delivered.');
      return;
    }
    
    setConfirmModal({ visible: true, stepIndex, stepName: step.step });
  };

  const confirmWorkflowUpdate = async () => {
    const { stepIndex, stepName } = confirmModal;
    setConfirmModal({ visible: false, stepIndex: null, stepName: '' });
    setUpdatingStep(stepIndex);
    try {
      const res = await axios.put(`${API_ENDPOINTS.ORDERS}/workflow`, {
        orderId: id, stepIndex, status: 'Completed'
      });
      setOrder(res.data);
      setSuccessModal({ visible: true, title: 'Task Completed', message: `"${stepName}" has been marked as DONE!` });
    } catch (error) {
      Alert.alert('Error', 'Failed to update workflow');
    } finally { setUpdatingStep(null); }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }

    const newTotal = (order.billing.totalPaid || 0) + amount;
    try {
      const res = await axios.put(`${API_ENDPOINTS.ORDERS}/billing`, {
        orderId: id, totalPaid: newTotal
      });
      setOrder(res.data);
      setPaymentModalVisible(false);
      setPaymentAmount('');
      Alert.alert('Success', `₹${amount} payment recorded!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const handleUpdateBill = async () => {
    try {
      const res = await axios.put(`${API_ENDPOINTS.ORDERS}/${id}/update-bill`, {
        additionalCost, description: additionalDescription
      });
      setOrder(res.data);
      setEditBillModalVisible(false);
      setAdditionalCost('');
      setAdditionalDescription('');
      Alert.alert('Success', 'Bill updated successfully');
    } catch(e) {
      Alert.alert('Error', 'Failed to update bill');
    }
  };

  const checkDeliveryPrompt = () => {
    if (!isEstimateInvoice && order.status !== 'Delivered') {
      setTimeout(() => {
        Alert.alert(
          "Update Status",
          "Would you like to mark this order as Delivered now?",
          [
            { text: "No", style: "cancel" },
            { text: "Yes, Mark Delivered", onPress: async () => {
               try {
                 const updateRes = await axios.put(`${API_ENDPOINTS.ORDERS}/${id}/status`, { status: 'Delivered' });
                 setOrder(updateRes.data);
               } catch(e) {
                 Alert.alert('Error', 'Failed to update status');
               }
            }}
          ]
        );
      }, 1000);
    }
  };

  const handleDirectWhatsApp = async () => {
    try {
      const type = isEstimateInvoice ? 'estimate' : 'final';
      const res = await axios.get(`${API_ENDPOINTS.ORDERS}/${id}/invoice-whatsapp?type=${type}`);
      Linking.openURL(res.data.link);
      setInvoiceModalVisible(false);
      checkDeliveryPrompt();
    } catch {
      Alert.alert('Error', 'Failed to generate invoice link');
    }
  };

  const handleSharePDF = () => {
    generateAndSharePDF(isEstimateInvoice);
    setInvoiceModalVisible(false);
    checkDeliveryPrompt();
  };

  const handleAssign = async (staffId) => {
    try {
      const payload = { orderId: id };
      if (assignType === 'cutting') payload.cuttingMaster = staffId;
      if (assignType === 'stitching') payload.stitchingMaster = staffId;
      
      const res = await axios.put(`${API_ENDPOINTS.ORDERS}/assign`, payload);
      setOrder(res.data);
      setAssignModalVisible(false);
      
      // Enhance the success message
      setSuccessModal({ visible: true, title: 'Assigned successfully!', message: 'The order has been assigned to the new master.' });
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Failed to assign order';
      Alert.alert('Assignment Failed', errorMsg);
    }
  };

  const generateAndSharePDF = async (isEstimate = false) => {
    try {
      const title = isEstimate ? "ESTIMATE INVOICE" : "FINAL INVOICE";
      const totalAmount = order.billing?.estimatedCost || 0;
      const advancePaid = order.billing?.totalPaid || order.billing?.advancePaid || 0;
      const balanceDue = order.billing?.balanceDue || 0;
      const date = new Date().toLocaleDateString('en-GB');
      
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
              <h1>Aadvi Atelier</h1>
              <div class="title">${title}</div>
            </div>
            
            <div class="row">
              <div><span class="label">Order ID:</span> ${order.orderId ? order.orderId.split('-').pop() : ''}</div>
              <div><span class="label">Date:</span> ${date}</div>
            </div>
            <div class="row">
              <div><span class="label">Customer:</span> ${order.customer?.name}</div>
              <div><span class="label">Phone:</span> ${order.customer?.mobileNumber}</div>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${order.category} - ${order.dressType}<br/><small style="color: #777">${(order.specialInstructions || '').replace(/\n/g, '<br/>')}</small></td>
                  <td>${order.type}</td>
                  <td>${order.quantity || 1}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total-section">
              <div class="total-row"><span>Total Amount:</span> <span>₹${totalAmount.toLocaleString('en-IN')}</span></div>
              <div class="total-row"><span>Paid Amount:</span> <span>₹${advancePaid.toLocaleString('en-IN')}</span></div>
              <div class="total-row bold"><span>Balance Due:</span> <span>₹${balanceDue.toLocaleString('en-IN')}</span></div>
            </div>
            
            <div class="footer">
              Thank you for choosing Aadvi Atelier!<br/>
              For queries, please contact us.
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Invoice' });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleOpenInvoiceModal = (isEstimate) => {
    setIsEstimateInvoice(isEstimate);
    setInvoiceModalVisible(true);
  };

  const handleDeleteOrder = () => {
    Alert.alert('Delete Order', 'Are you sure you want to delete this order? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axios.delete(`${API_ENDPOINTS.ORDERS}/${id}`);
          Alert.alert('Success', 'Order deleted successfully', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } catch (error) {
          Alert.alert('Error', 'Failed to delete order');
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} style={{flex:1}} />
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS['Pending'];
  const completedSteps = order.workflow?.filter(s => s.status === 'Completed').length || 0;
  const totalSteps = order.workflow?.length || 12;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View>
          {user?.role === 'owner' && (
            <TouchableOpacity onPress={handleDeleteOrder}>
              <Trash2 size={24} color={'#ffffffff'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        
        {/* Customer Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <User size={24} color={Colors.primary} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.customerName}>{order.customer?.name}</Text>
              <Text style={styles.customerPhone}>{order.customer?.mobileNumber}</Text>
            </View>
            <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg, borderColor: statusStyle.border}]}>
              <Text style={[styles.statusText, {color: statusStyle.text}]}>{order.status}</Text>
            </View>
          </View>
          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
              <Phone size={18} color={Colors.primary} />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, {backgroundColor: '#25D36615'}]} onPress={handleWhatsApp}>
              <MessageCircle size={18} color="#25D366" />
              <Text style={[styles.contactBtnText, {color: '#25D366'}]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Info Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Info</Text>
          <InfoRow label="Order ID" value={order.orderId ? order.orderId.split('-').pop() : ''} />
          {order.createdBy && <InfoRow label="Created By" value={`${order.createdBy.name} (${order.createdBy.role === 'owner' ? 'Owner' : 'Admin'})`} />}
          <InfoRow label="Category" value={order.category} />
          <InfoRow label="Dress Type" value={order.dressType} />
          <InfoRow label="Type" value={order.type || 'Stitching'} />
          <InfoRow label="Quantity" value={String(order.quantity || 1)} />
          <InfoRow label="Priority" value={order.priority || 'Normal'} highlight={order.priority === 'High'} />
          {order.isAariWork && <InfoRow label="Aari Work" value="Yes ✨" highlight />}
          {order.specialInstructions && <InfoRow label="Instructions" value={order.specialInstructions} />}
          {order.audioInstruction && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 10, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: '#eee'}}>
              <TouchableOpacity onPress={() => playAudio(order.audioInstruction)} style={{padding: 8, backgroundColor: Colors.primary+'20', borderRadius: 20}}>
                {isPlaying ? <Square size={20} color={Colors.primary} /> : <Play size={20} color={Colors.primary} fill={Colors.primary} />}
              </TouchableOpacity>
                <View style={{flex: 1, marginHorizontal: 10}}>
                  <View style={{height: 4, backgroundColor: '#ddd', borderRadius: 2, overflow: 'hidden'}}>
                    <View style={{height: '100%', backgroundColor: Colors.primary, width: `${audioDuration > 0 ? (audioPosition / audioDuration) * 100 : 0}%`}} />
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                    <Text style={{fontSize: 10, color: Colors.textSecondary}}>{formatTime(audioPosition)}</Text>
                    <Text style={{fontSize: 10, color: Colors.textSecondary}}>{formatTime(audioDuration)}</Text>
                  </View>
                </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.dateGrid}>
            <View style={styles.dateBox}>
              <Calendar size={16} color={Colors.textSecondary} />
              <Text style={styles.dateLabel}>Order Date</Text>
              <Text style={styles.dateValue}>{new Date(order.createdAt).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</Text>
            </View>
            {order.trialDate && (
              <View style={styles.dateBox}>
                <Clock size={16} color={Colors.secondary} />
                <Text style={styles.dateLabel}>Trial Date</Text>
                <Text style={styles.dateValue}>{new Date(order.trialDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</Text>
              </View>
            )}
            <View style={styles.dateBox}>
              <Package size={16} color={Colors.primary} />
              <Text style={styles.dateLabel}>Delivery</Text>
              <Text style={[styles.dateValue, {color: Colors.primary, fontWeight: 'bold'}]}>{new Date(order.deliveryDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</Text>
            </View>
          </View>
        </View>

        {/* Reference Image */}
        {order.referenceImage && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reference Image</Text>
            <Image source={{uri: order.referenceImage}} style={styles.refImage} resizeMode="cover" />
          </View>
        )}

        {/* Billing Card */}
        {user?.role !== 'cutting_master' && user?.role !== 'stitching_master' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Billing</Text>
          <View style={styles.billingGrid}>
            <View style={[styles.billingBox, {borderLeftColor: Colors.primary}]}>
              <Text style={styles.billingLabel}>Total</Text>
              <Text style={[styles.billingValue, {color: Colors.primary}]}>₹{order.billing?.estimatedCost?.toLocaleString('en-IN') || 0}</Text>
            </View>
            <View style={[styles.billingBox, {borderLeftColor: Colors.success}]}>
              <Text style={styles.billingLabel}>Paid</Text>
              <Text style={[styles.billingValue, {color: Colors.success}]}>₹{(order.billing?.totalPaid || order.billing?.advancePaid || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.billingBox, {borderLeftColor: Colors.error}]}>
              <Text style={styles.billingLabel}>Balance</Text>
              <Text style={[styles.billingValue, {color: Colors.error}]}>₹{(order.billing?.balanceDue || 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={styles.paymentStatusRow}>
            <Text style={styles.paymentStatusLabel}>Payment Status:</Text>
            <Text style={[styles.paymentStatusValue, {
              color: order.billing?.paymentStatus === 'Paid' ? Colors.success : 
                     order.billing?.paymentStatus === 'Partially Paid' ? Colors.warning : Colors.error
            }]}>{order.billing?.paymentStatus || 'Unpaid'}</Text>
          </View>
          
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <View style={{flexDirection: 'row', gap: Spacing.sm}}>
              <TouchableOpacity style={[styles.recordPaymentBtn, {flex: 1}]} onPress={() => setPaymentModalVisible(true)}>
                <CreditCard size={18} color={Colors.white} />
                <Text style={styles.recordPaymentText}>Record Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recordPaymentBtn, {flex: 1, backgroundColor: Colors.secondary}]} onPress={() => setEditBillModalVisible(true)}>
                <Edit3 size={18} color={Colors.white} />
                <Text style={styles.recordPaymentText}>Edit Bill</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.invoiceBtnRow}>
            <TouchableOpacity style={styles.invoiceBtn} onPress={() => handleOpenInvoiceModal(true)}>
              <FileText size={16} color={Colors.primary} />
              <Text style={styles.invoiceBtnText}>Estimate Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.invoiceBtn, {backgroundColor: Colors.primary}]} onPress={() => handleOpenInvoiceModal(false)}>
              <MessageCircle size={16} color={Colors.white} />
              <Text style={[styles.invoiceBtnText, {color: Colors.white}]}>Final Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Workflow Card */}
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Assign Staff</Text>
            <View style={{flexDirection: 'row', gap: Spacing.sm}}>
              <TouchableOpacity 
                style={[styles.recordPaymentBtn, {flex: 1, backgroundColor: order.assignedTo?.cuttingMaster ? Colors.success : Colors.primary, paddingHorizontal: 5}]} 
                onPress={() => { setAssignType('cutting'); setAssignModalVisible(true); }}
              >
                <User size={16} color={Colors.white} />
                <Text style={[styles.recordPaymentText, {fontSize: 13, marginLeft: 4}]} numberOfLines={1} adjustsFontSizeToFit>
                  {order.assignedTo?.cuttingMaster ? 'Edit Cutting' : '+ Cutting'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.recordPaymentBtn, {flex: 1, backgroundColor: order.assignedTo?.stitchingMaster ? Colors.success : Colors.secondary, paddingHorizontal: 5}]} 
                onPress={() => { setAssignType('stitching'); setAssignModalVisible(true); }}
              >
                <User size={16} color={Colors.white} />
                <Text style={[styles.recordPaymentText, {fontSize: 13, marginLeft: 4}]} numberOfLines={1} adjustsFontSizeToFit>
                  {order.assignedTo?.stitchingMaster ? 'Edit Stitching' : '+ Stitching'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <TouchableOpacity style={styles.workflowHeader} onPress={() => setWorkflowExpanded(!workflowExpanded)}>
            <View>
              <Text style={styles.sectionTitle}>Production Workflow</Text>
              <Text style={styles.progressText}>{completedSteps}/{totalSteps} steps • {progressPercent}%</Text>
            </View>
            {workflowExpanded ? <ChevronUp size={20} color={Colors.textSecondary}/> : <ChevronDown size={20} color={Colors.textSecondary}/>}
          </TouchableOpacity>
          
          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {width: `${progressPercent}%`}]} />
          </View>

          {workflowExpanded && order.workflow?.map((step, index) => {
            const isCompleted = step.status === 'Completed';
            const Icon = WORKFLOW_ICONS[step.step] || Circle;
            const isUpdating = updatingStep === index;
            const isLockedDelivery = step.step === 'Delivery' && order.billing?.paymentStatus !== 'Paid';

            const isRelevantForUser = () => {
              if (user?.role === 'owner' || user?.role === 'admin') return true;
              if (user?.role === 'cutting_master') return ['Marking', 'Cutting'].includes(step.step);
              if (user?.role === 'stitching_master') return ['Stitching', 'Aari Work / Embroidery', 'Hook and Hem'].includes(step.step);
              return false;
            };
            const canTap = isRelevantForUser();

            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.workflowStep, isCompleted && styles.workflowStepDone, (isLockedDelivery || (!canTap && !isCompleted)) && {opacity: 0.7}]}
                onPress={() => handleWorkflowUpdate(index)}
                disabled={isCompleted || isUpdating || !canTap}
              >
                <View style={[styles.stepCircle, isCompleted && styles.stepCircleDone, isLockedDelivery && {backgroundColor: Colors.border}]}>
                  {isUpdating ? <ActivityIndicator size="small" color={Colors.white} /> :
                   isCompleted ? <CheckCircle size={16} color={Colors.white} /> : 
                   <Text style={styles.stepNumber}>{index + 1}</Text>}
                </View>
                <View style={{flex: 1}}>
                  <Text style={[styles.stepName, isCompleted && styles.stepNameDone]}>{step.step}</Text>
                  {isCompleted && step.updatedAt && (
                    <Text style={styles.stepDate}>{new Date(step.updatedAt).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</Text>
                  )}
                </View>
                {!isCompleted && canTap && (
                  <Text style={[styles.tapHint, isLockedDelivery && {color: '#E53935', fontWeight: 'bold'}]}>
                    {isLockedDelivery ? 'Payment Required' : 'Tap to complete'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Measurements Card */}
        {order.measurements && Object.keys(order.measurements).filter(k => order.measurements[k] && typeof order.measurements[k] !== 'object' && !['_id', '__v', 'dressType', 'isSampleDress', 'sampleDressPhoto', 'customNotes'].includes(k)).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Measurements</Text>
            <View style={styles.measureGrid}>
              {Object.entries(order.measurements)
                .filter(([k, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object' && !['_id', '__v', 'dressType', 'isSampleDress', 'sampleDressPhoto', 'customNotes'].includes(k))
                .map(([key, val]) => (
                <View key={key} style={styles.measureItem}>
                  <Text style={styles.measureLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  <Text style={styles.measureValue}>{String(val)}</Text>
                </View>
              ))}
            </View>
            {order.measurements.customNotes && (
              <View style={{marginTop: Spacing.sm}}>
                <Text style={styles.measureLabel}>Notes</Text>
                <Text style={{fontSize: 14, color: Colors.text}}>{order.measurements.customNotes}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalSubtitle}>Balance Due: ₹{(order.billing?.balanceDue || 0).toLocaleString('en-IN')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              autoFocus
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setPaymentModalVisible(false); setPaymentAmount(''); }}>
                <Text style={{color: Colors.textSecondary, fontWeight: 'bold', fontSize: 16}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleRecordPayment}>
                <Text style={{color: Colors.white, fontWeight: 'bold', fontSize: 16}}>Record ₹{paymentAmount || '0'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Bill Modal */}
      <Modal visible={editBillModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Extra Charges</Text>
            <Text style={styles.modalSubtitle}>Edit bill if extra work was added</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Extra Amount (₹)"
              keyboardType="numeric"
              value={additionalCost}
              onChangeText={setAdditionalCost}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]}
              placeholder="Reason / Description"
              value={additionalDescription}
              onChangeText={setAdditionalDescription}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setEditBillModalVisible(false); setAdditionalCost(''); setAdditionalDescription(''); }}>
                <Text style={{color: Colors.textSecondary, fontWeight: 'bold', fontSize: 16}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUpdateBill}>
                <Text style={{color: Colors.white, fontWeight: 'bold', fontSize: 16}}>Update Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invoice Options Modal */}
      <Modal visible={invoiceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {padding: 24}]}>
            <View style={styles.modalHandle} />
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: Colors.text}}>
                {isEstimateInvoice ? 'Estimate Bill' : 'Final Bill Preview'}
              </Text>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={{backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 25}}>
              <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 12, color: Colors.primary}}>{order.customer?.name}</Text>
              <InfoRow label="Item" value={`${order.category} - ${order.dressType}`} />
              <InfoRow label="Total Amount" value={`₹${order.billing?.estimatedCost || 0}`} />
              <InfoRow label="Paid Amount" value={`₹${order.billing?.totalPaid || order.billing?.advancePaid || 0}`} />
              <View style={{height: 1, backgroundColor: '#E0E0E0', my: 10}} />
              <InfoRow label="Balance Due" value={`₹${order.billing?.balanceDue || 0}`} highlight />
            </View>

            <View style={{gap: 12, paddingBottom: 20}}>
              <TouchableOpacity 
                style={{backgroundColor: '#25D366', flexDirection: 'row', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8}} 
                onPress={handleDirectWhatsApp}
              >
                 <MessageCircle size={20} color="#fff" />
                 <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>Send Direct via WhatsApp</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{flexDirection: 'row', height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', gap: 8}} 
                onPress={handleSharePDF}
              >
                 <FileText size={20} color={Colors.primary} />
                 <Text style={{color: Colors.primary, fontWeight: 'bold', fontSize: 16}}>Share / Save PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Staff Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {padding: 24, height: '70%'}]}>
            <View style={styles.modalHandle} />
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: Colors.text}}>
                Assign {assignType === 'cutting' ? 'Cutting Master' : 'Stitching Master'}
              </Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {staffList.filter(s => s.role === (assignType === 'cutting' ? 'cutting_master' : 'stitching_master')).map(staff => (
                <TouchableOpacity 
                  key={staff._id} 
                  style={{flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#eee'}}
                  onPress={() => handleAssign(staff._id)}
                >
                  <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary+'20', justifyContent: 'center', alignItems: 'center', marginRight: 15}}>
                    <User size={20} color={Colors.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={{fontWeight: 'bold', fontSize: 16}}>{staff.name || 'Staff'} <Text style={{fontWeight: 'normal', fontSize: 12, color: Colors.textSecondary}}>({staff.role === 'cutting_master' ? 'Cutting' : 'Stitching'})</Text></Text>
                    <Text style={{color: Colors.textSecondary, fontSize: 13}}>{staff.mobileNumber}</Text>
                  </View>
                  {(order.assignedTo?.cuttingMaster === staff._id || order.assignedTo?.stitchingMaster === staff._id) && (
                    <CheckCircle size={20} color={Colors.success} />
                  )}
                </TouchableOpacity>
              ))}
              {staffList.filter(s => s.role === (assignType === 'cutting' ? 'cutting_master' : 'stitching_master')).length === 0 && (
                <Text style={{textAlign: 'center', color: Colors.textSecondary, marginTop: 20}}>No staff available for this role.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmModal.visible}
        title="Update Workflow"
        message={`Mark "${confirmModal.stepName}" as Completed?`}
        onCancel={() => setConfirmModal({ visible: false, stepIndex: null, stepName: '' })}
        onConfirm={confirmWorkflowUpdate}
        confirmText="Confirm"
        cancelText="Cancel"
        isDestructive={false}
      />

      <SuccessModal 
        visible={successModal.visible} 
        title={successModal.title}
        message={successModal.message} 
        onDone={() => setSuccessModal({ visible: false, message: '', title: '' })} 
      />
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, highlight }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, highlight && {color: Colors.secondary, fontWeight: 'bold'}]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
    marginTop: 15,

  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.white,marginBottom:-6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  scrollContent: { padding: Spacing.lg },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.sm, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },

  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  customerName: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  customerPhone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: 'bold' },

  contactRow: { flexDirection: 'row', gap: Spacing.md },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.primary + '10', gap: 8 },
  contactBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: Colors.text, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  dateGrid: { flexDirection: 'row', gap: Spacing.sm },
  dateBox: { flex: 1, alignItems: 'center', backgroundColor: '#F8F9FA', padding: Spacing.sm, borderRadius: BorderRadius.md, gap: 4 },
  dateLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' },
  dateValue: { fontSize: 13, color: Colors.text, fontWeight: '600', textAlign: 'center' },

  refImage: { width: '100%', height: 200, borderRadius: BorderRadius.md },

  billingGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  billingBox: { flex: 1, backgroundColor: '#F8F9FA', padding: Spacing.sm, borderRadius: BorderRadius.md, borderLeftWidth: 3, alignItems: 'center' },
  billingLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  billingValue: { fontSize: 16, fontWeight: 'bold' },
  paymentStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  paymentStatusLabel: { fontSize: 14, color: Colors.textSecondary },
  paymentStatusValue: { fontSize: 14, fontWeight: 'bold' },
  recordPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 44, borderRadius: 15, gap: 8, marginBottom: Spacing.md },
  recordPaymentText: { color: Colors.white, fontWeight: 'bold', fontSize: 15 },
  invoiceBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  invoiceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary+'15', height: 44, borderRadius: 15, gap: 6 },
  invoiceBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },

  workflowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  progressText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: '#EEEEEE', borderRadius: 3, marginBottom: Spacing.md, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  workflowStep: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: Spacing.md },
  workflowStepDone: { opacity: 0.7 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  stepCircleDone: { backgroundColor: Colors.success },
  stepNumber: { fontSize: 12, color: Colors.textSecondary, fontWeight: 'bold' },
  stepName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  stepNameDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  stepDate: { fontSize: 11, color: Colors.textSecondary },
  tapHint: { fontSize: 11, color: Colors.primary },

  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  measureItem: { width: '47%', backgroundColor: '#F8F9FA', padding: Spacing.sm, borderRadius: BorderRadius.sm },
  measureLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: 2 },
  measureValue: { fontSize: 15, fontWeight: 'bold', color: Colors.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
  modalHandle: { width: 48, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#EEEEEE', backgroundColor: '#F8F9FA', borderRadius: 16, padding: Spacing.md, fontSize: 16, marginBottom: Spacing.lg, color: Colors.text },
  modalButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: 10 },
  modalCancel: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#F5F5F5' },
  modalConfirm: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: Colors.primary, ...Shadows.sm },
});
