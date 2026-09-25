import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Linking,
  Modal,
  Alert,
  DeviceEventEmitter
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Search, ChevronRight, Share2, MessageCircle, FileText, X, Trash2 } from 'lucide-react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import StateView from '../../components/StateView';
import { TableSkeleton } from '../../components/Skeleton';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { buildInvoiceHtml } from '../../utils/invoiceTemplate';

const TABS = ['Active', 'Past Due', 'Upcoming', 'Pending Amount', 'Delivered', 'Draft'];

export default function OrdersScreen() {
  const router = useRouter();
  const { overview } = useLocalSearchParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Active');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [shareModal, setShareModal] = useState({ visible: false, group: null, invoiceType: null });
  const [detailGroup, setDetailGroup] = useState(null);
  const [deleteGroup, setDeleteGroup] = useState(null);

  useEffect(() => {
    if (overview) {
      setActiveTab(overview === 'completed' ? 'Delivered' : overview === 'payment-pending' ? 'Pending Amount' : overview === 'overdue' ? 'Past Due' : overview === 'draft' ? 'Draft' : 'Active');
    }
  }, [overview]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await axios.get(API_ENDPOINTS.ORDERS);
      setOrders(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        setError(error.message || 'Failed to fetch orders');
        console.error('Failed to fetch orders', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const isOverdue = (order) => {
    if (!order.deliveryDate || order.status === 'Delivered' || order.status === 'Draft') return false;

    const deliveryDate = new Date(order.deliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workflowComplete = order.workflow?.length > 0 && order.workflow.every(step => step.status === 'Completed');

    return deliveryDate.getTime() < today.getTime() && !workflowComplete;
  };

  const getCounts = () => {
    const today = new Date();
    today.setHours(0,0,0,0);

    return {
      'Active': orders.filter(o => o.status !== 'Delivered' && o.status !== 'Draft').length,
      'Past Due': orders.filter(isOverdue).length,
      'Upcoming': orders.filter(o => o.status !== 'Delivered' && new Date(o.deliveryDate).setHours(0,0,0,0) >= today.getTime()).length,
      'Pending Amount': orders.filter(o => o.billing?.balanceDue > 0).length,
      'Delivered': orders.filter(o => o.status === 'Delivered').length,
      'Draft': orders.filter(o => o.status === 'Draft').length,
    };
  };

  const counts = getCounts();

  const getFilteredOrders = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return orders.filter(order => {
      const isDelivered = order.status === 'Delivered';
      const isDraft = order.status === 'Draft';
      const deliveryDate = new Date(order.deliveryDate);
      deliveryDate.setHours(0,0,0,0);

      let matchesTab = true;
      switch(activeTab) {
        case 'Active': matchesTab = !isDelivered && !isDraft; break;
        case 'Past Due': matchesTab = isOverdue(order); break;
        case 'Upcoming': matchesTab = !isDelivered && deliveryDate.getTime() >= today.getTime(); break;
        case 'Pending Amount': matchesTab = order.billing?.balanceDue > 0; break;
        case 'Delivered': matchesTab = isDelivered; break;
        case 'Draft': matchesTab = isDraft; break;
      }

      if (!matchesTab) return false;

      const matchesOverview = {
        'today-deliveries': order.deliveryDate && deliveryDate.getTime() === today.getTime(),
        pending: order.status === 'Pending',
        'under-stitching': order.workflow?.some(step => step.step === 'Cutting' && step.status === 'Completed') && order.workflow?.some(step => step.step === 'Stitching' && step.status === 'Pending'),
        'aari-pending': order.workflow?.some(step => step.step === 'Aari Work / Embroidery' && step.status === 'Pending'),
        completed: order.status === 'Delivered',
        overdue: isOverdue(order),
        draft: order.status === 'Draft',
        'payment-pending': order.billing?.balanceDue > 0,
      };

      if (overview && !matchesOverview[overview]) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = order.customer?.name?.toLowerCase().includes(query);
        const matchesPhone = order.customer?.mobileNumber?.includes(query);
        const matchesOrderId = order.orderId?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesOrderId) {
          return false;
        }
      }

      return true;
    });
  };

  const isOrderComplete = (order) => (
    order.status === 'Delivered' ||
    (order.workflow?.length > 0 && order.workflow.every(step => step.status === 'Completed'))
  );

  const isGroupComplete = (group) => group.orders.every(isOrderComplete);

  const fetchImageAsDataUri = async (imageUrl) => {
    const fileUri = `${FileSystem.cacheDirectory}payment-qr-${Date.now()}.png`;
    await FileSystem.downloadAsync(imageUrl, fileUri);
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  };

  const getOrderDayKey = (order) => {
    const date = order.createdAt || order.orderId?.split('-')[1];
    if (!date) return 'unknown';
    if (/^\d{8}$/.test(date)) return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? 'unknown' : parsedDate.toISOString().slice(0, 10);
  };

  const formatGroupDate = (dateKey) => dateKey === 'unknown'
    ? 'Unknown date'
    : new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const generateGroupPDF = async (group, invoiceType) => {
    try {
      const customer = group.orders[0].customer;
      const grandTotal = group.totalAmount;
      const totalAdvance = group.orders.reduce((sum, item) => sum + (item.billing?.totalPaid || item.billing?.advancePaid || 0), 0);
      const balanceDue = Math.max(grandTotal - totalAdvance, 0);
      const date = new Date().toLocaleDateString('en-GB');

      let qrCodeHtml = '';
      let qrDataUri = '';
      if (balanceDue > 0) {
        // IMPORTANT: Update this UPI ID to your actual business UPI ID
        const upiId = 'sathyaatamilselvan-1@oksbi'; 
        const upiName = 'Sathyaa Tamilselvan';
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${balanceDue}&cu=INR`;
        const qrUrl = `https://quickchart.io/qr?format=png&size=300&text=${encodeURIComponent(upiUrl)}`;
        qrDataUri = await fetchImageAsDataUri(qrUrl);
        
        qrCodeHtml = `
          <div style="margin-top: 30px; float: left; text-align: center; border: 1px dashed #5959be; padding: 15px; border-radius: 8px; background-color: #fcfcff;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #5959be;">Scan to Pay Balance</p>
            <img src="${qrDataUri}" width="120" height="120" alt="UPI QR Code" />
            <p style="margin: 8px 0 8px 0; font-size: 15px; font-weight: bold;">₹${balanceDue.toLocaleString('en-IN')}</p>
            <div style="display: flex; justify-content: center; gap: 10px; align-items: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/120px-Google_Pay_Logo.svg.png" height="14" alt="GPay" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/120px-PhonePe_Logo.svg.png" height="16" alt="PhonePe" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/120px-Paytm_Logo_%28standalone%29.svg.png" height="10" alt="Paytm" />
            </div>
          </div>
        `;
      }
      
      let itemsHtml = group.orders.map((item, idx) => {
        let extraHtml = '';
        if (item.extraCharges && item.extraCharges.length > 0) {
          extraHtml = item.extraCharges.map(ec => `<br/><small style="color: #555">+ Extra Charge (${ec.description || 'Other'}): ₹${ec.amount}</small>`).join('');
        }
        return `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.category} - ${item.dressType}<br/><small style="color: #777">${(item.specialInstructions || '').replace(/\n/g, '<br/>')}</small>${extraHtml}</td>
          <td>${item.quantity || 1}</td>
          <td>₹${item.stitchingPrice || 0}</td>
          <td style="text-align: right;">₹${item.billing?.estimatedCost || 0}</td>
        </tr>
      `}).join('');
      
      const html = buildInvoiceHtml({
        invoiceType,
        customer,
        orders: group.orders,
        qrDataUri,
      });

      const legacyHtml = `
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
              <div class="title">${invoiceType === 'final' ? 'FINAL INVOICE' : 'ESTIMATE INVOICE'}</div>
            </div>
            
            <div class="row">
              <div><span class="label">Order Date:</span> ${formatGroupDate(group.dateKey)}</div>
              <div><span class="label">Generated:</span> ${date}</div>
            </div>
            
            <div class="row">
              <div><span class="label">Customer:</span> ${customer?.name || 'Customer'}</div>
              <div><span class="label">Phone:</span> ${customer?.mobileNumber || ''}</div>
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
                <div class="total-row"><span>Paid Amount:</span> <span>₹${totalAdvance.toLocaleString('en-IN')}</span></div>
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
      
      void legacyHtml;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Invoice' });
    } catch (e) {
      console.log(e);
      Alert.alert('Error', `Failed to generate PDF: ${e.message}`);
    }
  };

  const sendGroupInvoice = async (group) => {
    setShareModal({ visible: true, group, invoiceType: null });
  };

  const closeShareModal = () => {
    setShareModal({ visible: false, group: null, invoiceType: null });
  };

  const handleDeleteGroup = (group) => {
    const orderCount = group.orders.length;
    setDeleteGroup({ group, orderCount });
  };

  const confirmDeleteGroup = async () => {
    const group = deleteGroup?.group;
    if (!group) return;

    setDeleteGroup(null);
    try {
      await Promise.all(group.orders.map(order => axios.delete(`${API_ENDPOINTS.ORDERS}/${order._id}`)));
      setDetailGroup(null);
      DeviceEventEmitter.emit('ordersChanged');
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete all orders.');
    }
  };

  const getGroupedOrders = () => {
    const filtered = getFilteredOrders();

    if (user?.role === 'cutting_master' || user?.role === 'stitching_master') {
      const customerGroups = {};

      filtered.forEach(order => {
        const customerId = order.customer?._id || order.customer?.name || 'unknown';
        if (!customerGroups[customerId]) {
          customerGroups[customerId] = {
            id: `staff_${customerId}`,
            customerId: order.customer?._id,
            customerName: order.customer?.name || 'Unknown',
            orders: []
          };
        }
        customerGroups[customerId].orders.push(order);
      });

      return Object.values(customerGroups)
        .sort((a, b) => {
          const dateA = a.orders[0]?.createdAt ? new Date(a.orders[0].createdAt).getTime() : 0;
          const dateB = b.orders[0]?.createdAt ? new Date(b.orders[0].createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .map(group => ({ type: 'staffCustomer', id: group.id, data: group }));
    }

    const groups = {};
    
    filtered.forEach(order => {
      const datePart = getOrderDayKey(order);
      const customerId = order.customer?._id || 'unknown';
      const key = `${customerId}_${datePart}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          customerName: order.customer?.name || 'Unknown',
          datePart: datePart,
          dateKey: datePart,
          orders: [],
          totalAmount: 0
        };
      }
      groups[key].orders.push(order);
      groups[key].totalAmount += (order.billing?.estimatedCost || 0);
    });

    const flattened = [];
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const dateA = a.orders[0]?.createdAt ? new Date(a.orders[0].createdAt).getTime() : 0;
      const dateB = b.orders[0]?.createdAt ? new Date(b.orders[0].createdAt).getTime() : 0;
      return dateB - dateA;
    });

    sortedGroups.forEach(group => {
      if (group.orders.length === 1) {
        flattened.push({ type: 'single', id: group.orders[0]._id, data: group.orders[0] });
      } else {
        flattened.push({ type: 'groupHeader', id: group.id, data: group });
        if (expandedGroups[group.id]) {
          group.orders.forEach(order => {
            flattened.push({ type: 'groupItem', id: order._id, data: order });
          });
        }
      }
    });

    return flattened;
  };

  const displayData = getGroupedOrders();

  const isStaff = user?.role === 'cutting_master' || user?.role === 'stitching_master';
  const visibleTabs = isStaff ? TABS.filter(t => t !== 'Pending Amount') : TABS;

  const getStatusMeta = (status) => {
    switch (status) {
      case 'Delivered':
        return { label: 'Completed', backgroundColor: '#DCFCE7', color: '#15803D' };
      case 'Overdue':
        return { label: 'Overdue', backgroundColor: '#FEE2E2', color: '#B91C1C' };
      case 'Ready':
        return { label: 'Ready', backgroundColor: '#DBEAFE', color: '#1D4ED8' };
      case 'In Progress':
        return { label: 'Processing', backgroundColor: '#FEF3C7', color: '#B45309' };
      case 'Draft':
        return { label: 'Draft', backgroundColor: '#E5E7EB', color: '#4B5563' };
      case 'Mixed':
        return { label: 'Mixed', backgroundColor: '#EDE9FE', color: '#6D28D9' };
      default:
        return { label: 'Pending', backgroundColor: '#FEE2E2', color: '#B91C1C' };
    }
  };

  const StatusBadge = ({ status }) => {
    const meta = getStatusMeta(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: meta.backgroundColor }]}>
        <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    );
  };

  const getGroupStatus = (orders) => {
    if (orders.some(isOverdue)) return 'Overdue';
    const statuses = [...new Set(orders.map(order => order.status))];
    return statuses.length === 1 ? statuses[0] : 'Mixed';
  };

  const AssignmentBadges = ({ order }) => {
    const cuttingMaster = order.assignedTo?.cuttingMaster;
    const stitchingMaster = order.assignedTo?.stitchingMaster;
    const cuttingName = typeof cuttingMaster === 'object' ? cuttingMaster?.name : null;
    const stitchingName = typeof stitchingMaster === 'object' ? stitchingMaster?.name : null;
    if (!cuttingName && !stitchingName) return null;

    return (
      <View style={styles.assignmentBadges}>
        {cuttingName && <Text style={[styles.assignmentBadge, styles.cuttingBadge]} numberOfLines={1}>Cut: {cuttingName}</Text>}
        {stitchingName && <Text style={[styles.assignmentBadge, styles.stitchingBadge]} numberOfLines={1}>Stitch: {stitchingName}</Text>}
      </View>
    );
  };

  const renderOrderItem = ({ item }) => {
    if (item.type === 'staffCustomer') {
      const group = item.data;
      return (
        <TouchableOpacity
          style={[styles.tableRow, { backgroundColor: '#E8EDF2', borderColor: Colors.border }]}
          onPress={() => router.push({ pathname: '/view-order', params: { customerId: group.customerId } })}
        >
          <View style={[styles.rowCol, {flex: 1.1}]}>
            <Text style={[styles.cellText, {fontWeight: 'bold', color: Colors.primary}]} numberOfLines={1}>
              {group.customerName}
            </Text>
          </View>
          <View style={[styles.rowCol, {flex: 1.2}]}>
            <Text style={[styles.cellText, {textAlign: 'center', color: Colors.primary, fontWeight: 'bold'}]} numberOfLines={1}>
              {group.orders.length} {group.orders.length === 1 ? 'Order' : 'Orders'}
            </Text>
          </View>
          <ChevronRight size={16} color={Colors.primary} style={{ marginTop: 15 }} />
        </TouchableOpacity>
      );
    }

    if (item.type === 'single' || item.type === 'groupItem') {
      const order = item.data;
      const isNested = item.type === 'groupItem';
      return (
        <TouchableOpacity 
          style={[styles.tableRow, isNested && { backgroundColor: '#F0F4F8', marginLeft: Spacing.xl, borderLeftWidth: 3, borderLeftColor: Colors.primary }]}
          onPress={() => router.push({ pathname: '/order-details', params: { id: order._id } })}
          onLongPress={!isStaff ? () => setDetailGroup({
            id: `single_${order._id}`,
            customerName: order.customer?.name || 'Customer',
            dateKey: getOrderDayKey(order),
            orders: [order]
          }) : undefined}
          delayLongPress={450}
        >
          <View style={[styles.rowCol, {flex: 1.1}]}>
            <Text style={[styles.cellText, isNested && {fontSize: 13, color: Colors.textSecondary}]} numberOfLines={1}>
              {isNested ? '↳ ' + (order.category || 'Item') : (order.customer?.name || 'Unknown')}
            </Text>
          </View>
          <View style={[styles.rowCol, {flex: 1.2}]}>
            <Text style={[styles.cellText, {textAlign: 'center'}, isNested && {fontSize: 13}]} numberOfLines={1}>{order.orderId}</Text>
            {!isStaff && <StatusBadge status={isOverdue(order) ? 'Overdue' : order.status} />}
            {!isStaff && <AssignmentBadges order={order} />}
          </View>
          {!isStaff && (
          <View style={[styles.rowCol, {flex: 1, borderRightWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}]}>
            <Text style={[styles.cellText, isNested && {fontSize: 13}]} numberOfLines={1}>{order.billing?.estimatedCost || 0}</Text>
            <ChevronRight size={16} color={Colors.textSecondary} style={{marginLeft: 4}} />
          </View>
          )}
        </TouchableOpacity>
      );
    }
    
    if (item.type === 'groupHeader') {
      const group = item.data;
      const isExpanded = expandedGroups[group.id];
      return (
        <TouchableOpacity 
          style={[styles.tableRow, { backgroundColor: '#E8EDF2', borderColor: Colors.border }]}
          onPress={() => toggleGroup(group.id)}
          onLongPress={() => setDetailGroup(group)}
          delayLongPress={450}
        >
          <View style={[styles.rowCol, {flex: 1.1}]}>
            <Text style={[styles.cellText, {fontWeight: 'bold', color: Colors.primary}]} numberOfLines={1}>{group.customerName}</Text>
          </View>
          <View style={[styles.rowCol, {flex: 1.2}]}>
            <Text style={[styles.cellText, {textAlign: 'center', color: Colors.primary, fontSize: 13, fontWeight: 'bold'}]} numberOfLines={1}>
              {group.orders.length} Orders
            </Text>
            <StatusBadge status={getGroupStatus(group.orders)} />
          </View>
          {!isStaff && (
          <View style={[styles.rowCol, {flex: 1, borderRightWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}]}>
            <Text style={[styles.cellText, {fontWeight: 'bold', color: Colors.primary}]} numberOfLines={1}>{group.totalAmount}</Text>
            <TouchableOpacity onPress={() => sendGroupInvoice(group)} style={{paddingLeft: 8, paddingRight: 4}}>
              <Share2 size={18} color={Colors.primary} />
            </TouchableOpacity>
            <ChevronRight size={16} color={Colors.primary} style={{transform: [{rotate: isExpanded ? '90deg' : '0deg'}]}} />
          </View>
          )}
        </TouchableOpacity>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isSearching ? (
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10}}>
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name,phone or ID..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
              <Text style={{color: Colors.white, fontWeight: 'bold'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Orders</Text>
            <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.headerIcon}>
              <Search size={24} color={Colors.white} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Tabs */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => {
                  router.setParams({ overview: undefined });
                  setActiveTab(tab);
                }}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab} ({counts[tab] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Table Card */}
      <View style={styles.tableCard}>
        {/* Blue Header Bar */}
        <View style={styles.tableHeaderBar}>
          <View style={[styles.headerCol, {flex: 1.1}]}>
            <Text style={[styles.tableHeaderText, {textAlign: 'left'}]}>Customer Name</Text>
          </View>
          <View style={[styles.headerCol, {flex: 1.2}]}>
            <Text style={[styles.tableHeaderText, {textAlign: 'center'}]}>Order No</Text>
          </View>
          {!isStaff && (
          <View style={[styles.headerCol, {flex: 1, borderRightWidth: 0, alignItems: 'flex-end'}]}>
            <Text style={[styles.tableHeaderText, {textAlign: 'right', paddingRight: 2}]}>Amount</Text>
          </View>
          )}
        </View>

        {/* List */}
        <StateView 
          loading={loading && !refreshing}
          hasData={displayData.length > 0} 
          error={error} 
          onRetry={fetchOrders}
          SkeletonComponent={TableSkeleton}
        >
          <FlatList
            data={displayData}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              (!loading && !error) ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No Record Found!</Text>
                </View>
              ) : null
            }
          />
        </StateView>
      </View>

      <Modal visible={Boolean(detailGroup)} transparent animationType="slide" onRequestClose={() => setDetailGroup(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailModalContent]}>
            <View style={styles.modalHandle} />
            <View style={styles.detailModalHeader}>
              <View>
                <Text style={styles.detailModalTitle}>{`${detailGroup?.customerName || 'Customer'}'s Orders`}</Text>
                <Text style={styles.detailModalSubtitle}>
                  {detailGroup ? `${detailGroup.orders.length} Orders • ${formatGroupDate(detailGroup.dateKey)}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailGroup(null)}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {detailGroup?.orders.map(order => (
                <View key={order._id} style={styles.detailOrderRow}>
                  <TouchableOpacity
                    style={styles.detailOrderInfo}
                    onPress={() => {
                      setDetailGroup(null);
                      router.push({ pathname: '/order-details', params: { id: order._id } });
                    }}
                  >
                    <Text style={styles.detailOrderId}>{order.orderId}</Text>
                    <Text style={styles.detailOrderDescription}>{order.category} - {order.dressType}</Text>
                    <Text style={styles.detailOrderMeta}>Qty: {order.quantity || 1} • Due: {new Date(order.deliveryDate).toLocaleDateString('en-GB')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.deleteAllButton} onPress={() => handleDeleteGroup(detailGroup)}>
              <Trash2 size={20} color={Colors.white} />
              <Text style={styles.deleteAllButtonText}>
                {detailGroup?.orders.length === 1 ? 'Delete Order' : `Delete All ${detailGroup?.orders.length || ''} Orders`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={Boolean(deleteGroup)}
        title={deleteGroup?.orderCount === 1 ? 'Delete Order' : 'Delete All Orders'}
        message={deleteGroup?.orderCount === 1
          ? `Delete ${deleteGroup?.group.orders[0].orderId || 'this order'}? This cannot be undone.`
          : `Delete all ${deleteGroup?.orderCount} orders for ${deleteGroup?.group.customerName} on ${formatGroupDate(deleteGroup?.group.dateKey)}? This cannot be undone.`}
        onCancel={() => setDeleteGroup(null)}
        onConfirm={confirmDeleteGroup}
        confirmText={deleteGroup?.orderCount === 1 ? 'Delete Order' : 'Delete All'}
        cancelText="Keep Orders"
        isDestructive
      />

      {/* Share Master Invoice Modal */}
      <Modal visible={shareModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {padding: 24}]}>
            <View style={styles.modalHandle} />
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: Colors.text}}>
                {shareModal.invoiceType
                  ? `${shareModal.invoiceType === 'final' ? 'Final' : 'Estimate'} Bill`
                  : 'Choose Bill Type'}
              </Text>
              <TouchableOpacity onPress={closeShareModal}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {shareModal.group && !shareModal.invoiceType && (
              <View style={{gap: 12, paddingBottom: 20}}>
                <TouchableOpacity
                  style={{flexDirection: 'row', height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', gap: 8}}
                  onPress={() => setShareModal(prev => ({ ...prev, invoiceType: 'estimate' }))}
                >
                  <FileText size={20} color={Colors.primary} />
                  <Text style={{color: Colors.primary, fontWeight: 'bold', fontSize: 16}}>Estimate Bill</Text>
                </TouchableOpacity>
                {isGroupComplete(shareModal.group) && (
                  <TouchableOpacity
                    style={{backgroundColor: Colors.primary, flexDirection: 'row', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8}}
                    onPress={() => setShareModal(prev => ({ ...prev, invoiceType: 'final' }))}
                  >
                    <MessageCircle size={20} color={Colors.white} />
                    <Text style={{color: Colors.white, fontWeight: 'bold', fontSize: 16}}>Final Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {shareModal.group && shareModal.invoiceType && (() => {
              const customer = shareModal.group.orders[0].customer;
              const grandTotal = shareModal.group.totalAmount;
              const totalAdvance = shareModal.group.orders.reduce((sum, item) => sum + (item.billing?.totalPaid || item.billing?.advancePaid || 0), 0);
              const balanceDue = Math.max(grandTotal - totalAdvance, 0);
              
              return (
                <View style={{backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 25}}>
                  <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 12, color: Colors.primary}}>{customer?.name || 'Customer'}</Text>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                    <Text style={{color: Colors.textSecondary}}>Order Date</Text>
                    <Text style={{fontWeight: '600', color: Colors.text}}>{formatGroupDate(shareModal.group.dateKey)}</Text>
                  </View>
                  
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                    <Text style={{color: Colors.textSecondary}}>Orders Included</Text>
                    <Text style={{fontWeight: '600', color: Colors.text}}>{shareModal.group.orders.length}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                    <Text style={{color: Colors.textSecondary}}>Total Amount</Text>
                    <Text style={{fontWeight: '600', color: Colors.text}}>₹{grandTotal}</Text>
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                    <Text style={{color: Colors.textSecondary}}>Paid Amount</Text>
                    <Text style={{fontWeight: '600', color: Colors.text}}>₹{totalAdvance}</Text>
                  </View>
                  <View style={{height: 1, backgroundColor: '#E0E0E0', marginVertical: 10}} />
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: Colors.error, fontWeight: 'bold'}}>Balance Due</Text>
                    <Text style={{color: Colors.error, fontWeight: 'bold'}}>₹{balanceDue}</Text>
                  </View>
                </View>
              );
            })()}

            <View style={{gap: 12, paddingBottom: 20}}>
              <TouchableOpacity 
                style={{backgroundColor: '#25D366', flexDirection: 'row', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8}} 
                onPress={async () => {
                  if (!shareModal.group) return;
                  const group = shareModal.group;
                  try {
                    const customer = group.orders[0].customer;
                    let itemsList = group.orders.map((item, index) => `${index + 1}. ${item.category} - ${item.dressType} (₹${item.billing?.estimatedCost || 0})`).join('\n');
                    const grandTotal = group.totalAmount;
                    const totalAdvance = group.orders.reduce((sum, item) => sum + (item.billing?.totalPaid || item.billing?.advancePaid || 0), 0);
                    const balanceDue = Math.max(grandTotal - totalAdvance, 0);

                    const invoiceTitle = shareModal.invoiceType === 'final' ? 'FINAL BILL' : 'ESTIMATE BILL';
                    const message = `*Aadvi Designer Studio*\n🧾 *${invoiceTitle}*\n\n*Customer:* ${customer?.name || 'Customer'}\n*Order Date:* ${formatGroupDate(group.dateKey)}\n*Orders Included:* ${group.orders.length}\n\n*Items Ordered:*\n${itemsList}\n\n*Billing Summary:*\nGrand Total: ₹${grandTotal}\nTotal Paid: ₹${totalAdvance}\n*Balance Due:* ₹${balanceDue}\n\nThank you for choosing Aadvi Designer Studio! 🙏`;
                    
                    const encodedMessage = encodeURIComponent(message);
                    const link = `https://wa.me/91${(customer?.mobileNumber || '').replace(/\D/g, '')}?text=${encodedMessage}`;
                    
                    if (await Linking.canOpenURL(link)) {
                      await Linking.openURL(link);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                  closeShareModal();
                }}
              >
                 <MessageCircle size={20} color="#fff" />
                 <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>Send Direct via WhatsApp</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{flexDirection: 'row', height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', gap: 8}} 
                onPress={() => {
                  if (shareModal.group) generateGroupPDF(shareModal.group, shareModal.invoiceType);
                  closeShareModal();
                }}
              >
                 <FileText size={20} color={Colors.primary} />
                 <Text style={{color: Colors.primary, fontWeight: 'bold', fontSize: 16}}>Share / Save PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
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
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
   marginBottom:-6
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
  },
  
  tabsContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 0,
    gap: Spacing.md,
    
  },
  tabBtn: {
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabBtnActive: {
    borderBottomColor: Colors.primary
  },
  tabText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600'
  },
  tabTextActive: {
    color: Colors.primary
  },

  tableCard: {
    flex: 1,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    overflow: 'hidden'
  },
  tableHeaderBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    alignItems: 'stretch'
  },
  headerCol: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold'
  },

  listContent: { flexGrow: 1, paddingBottom: 90 },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    alignItems: 'stretch',
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  rowCol: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500'
  },
  statusBadge: {
    alignSelf: 'center',
    borderRadius: 10,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  assignmentBadges: { alignItems: 'center', marginTop: 4, gap: 3 },
  assignmentBadge: { maxWidth: '100%', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontWeight: '700' },
  cuttingBadge: { backgroundColor: '#E0F2FE', color: '#0369A1' },
  stitchingBadge: { backgroundColor: '#F3E8FF', color: '#7E22CE' },
  
  empty: { padding: Spacing.xl, alignItems: 'center', marginTop: 40 },
  emptyText: { color: Colors.text, fontSize: 16 },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '40%',
  },
  detailModalContent: {
    maxHeight: '75%',
    padding: 24,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  detailModalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  detailModalSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  detailOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 14,
  },
  detailOrderInfo: { flex: 1, paddingRight: 12 },
  detailOrderId: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  detailOrderDescription: { fontSize: 15, color: Colors.text, marginTop: 4 },
  detailOrderMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  deleteAllButton: { flexDirection: 'row', height: 54, borderRadius: 16, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  deleteAllButtonText: { color: Colors.white, fontSize: 17, fontWeight: 'bold' },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  }
});
