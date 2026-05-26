
import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Image, 
  Linking, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { 
  ArrowLeft, 
  PlusCircle, 
  Phone, 
  MessageCircle, 
  Mail, 
  Edit3, 
  MapPin, 
  Calendar,
  Layers,
  ShoppingBag,
  ChevronRight,
  TrendingUp,
  User,
  CreditCard,
  Target,
  Clock,
  Tag
} from 'lucide-react-native';

export default function CustomerDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${id}`);
      setData(response.data);
    } catch (error) {
      console.error('Fetch error', error);
      Alert.alert("Error", "Failed to load customer details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomerDetails(true);
  }, [id]);

  const handleCall = () => {
    if (data?.customer?.mobileNumber) {
      Linking.openURL(`tel:${data.customer.mobileNumber}`);
    }
  };

  const handleWhatsApp = () => {
    if (data?.customer?.mobileNumber) {
      Linking.openURL(`whatsapp://send?phone=91${data.customer.mobileNumber}`);
    }
  };

  const handleMail = () => {
    if (data?.customer?.email) {
      Linking.openURL(`mailto:${data.customer.email}`);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const { customer, stats, orders } = data;
  const isStaff = user?.role === 'cutting_master' || user?.role === 'stitching_master';

  const getDressIcon = (type) => {
    if (!type) return '👗';
    const t = type.toLowerCase();
    if (t.includes('pant') || t.includes('trouser')) return '👖';
    if (t.includes('shirt')) return '👕';
    if (t.includes('suit') || t.includes('blazer') || t.includes('coat')) return '🧥';
    if (t.includes('saree') || t.includes('sari')) return '🥻';
    if (t.includes('skirt') || t.includes('lehenga')) return '🥻'; // close enough for traditional wear
    return '👗';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        {!isStaff ? (
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/create-order', params: { customerId: id, customerGender: customer?.gender } })}
            style={styles.headerIcon}
          >
            <PlusCircle size={24} color={Colors.white} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Card 1: Primary Details */}
        <View style={styles.mainCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileImageContainer}>
              {customer.profileImage ? (
                <Image source={{ uri: customer.profileImage }} style={styles.profileImage} />
              ) : (
                <Text style={styles.initialsText}>{getInitials(customer.name)}</Text>
              )}
            </View>
            <View style={styles.nameSection}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.mobileText}>{customer.mobileNumber}</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionCircle} onPress={handleWhatsApp}>
              <MessageCircle size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCircle} onPress={handleCall}>
              <Phone size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCircle} onPress={handleMail}>
              <Mail size={22} color={Colors.primary} />
            </TouchableOpacity>
            {!isStaff && (
              <TouchableOpacity style={styles.actionCircle} onPress={() => router.push({ pathname: '/create-customer', params: { id: customer._id } })}>
                <Edit3 size={22} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Details List */}
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Mail size={18} color={Colors.primary} />
              <Text style={styles.detailValue}>{customer.email || 'No email provided'}</Text>
            </View>
            <View style={styles.detailItem}>
              <MapPin size={18} color={Colors.primary} />
              <Text style={styles.detailValue} numberOfLines={2}>
                {customer.address?.fullAddress || 'No address saved'}
              </Text>
            </View>
            
            {/* Split Stats Row: Pending / Revenue / Orders */}
            <View style={styles.statsRow}>
              {!isStaff && (
                <>
                  <View style={[styles.statBox, { borderLeftColor: Colors.error }]}>
                    <CreditCard size={18} color={Colors.error} />
                    <Text style={styles.statLabel}>Pending</Text>
                    <Text style={[styles.statValue, { color: Colors.error }]}>₹{stats.pendingRevenue.toLocaleString('en-IN')}</Text>
                  </View>
                  
                  <View style={[styles.statBox, { borderLeftColor: Colors.primary }]}>
                    <TrendingUp size={18} color={Colors.primary} />
                    <Text style={styles.statLabel}>Revenue</Text>
                    <Text style={styles.statValue}>₹{stats.totalRevenue.toLocaleString('en-IN')}</Text>
                  </View>
                </>
              )}

              <View style={[styles.statBox, { borderLeftColor: Colors.primary }]}>
                <Target size={18} color={Colors.primary} />
                <Text style={styles.statLabel}>Orders</Text>
                <Text style={[styles.statValue, { color: Colors.primary }]}>{stats.totalOrders}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card 2: Measurements */}
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push({ pathname: '/measurement', params: { customerId: id } })}>
          <View style={styles.menuLeft}>
            <View style={styles.menuIconBox}>
              <Layers size={24} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>Measurements</Text>
          </View>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View</Text>
            <ChevronRight size={16} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* Card 3: Orders */}
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push({ pathname: '/view-order', params: { customerId: id } })}>
          <View style={styles.menuLeft}>
            <View style={styles.menuIconBox}>
              <ShoppingBag size={24} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>View Order</Text>
          </View>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View</Text>
            <ChevronRight size={16} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* Card 4: Due Items Detailed */}
        <View style={styles.dueSection}>
          <Text style={styles.sectionTitle}>Recent/Due Items</Text>
          {orders.length > 0 ? (
            orders.map((order) => (
              <TouchableOpacity 
                key={order._id} 
                style={styles.detailedOrderCard}
                onPress={() => router.push({ pathname: '/order-details', params: { id: order._id } })}
              >
                 <View style={styles.detailedOrderTop}>
                    <View style={styles.detailedOrderImagePlaceholder}>
                       {order.referenceImage ? (
                         <Image source={{uri: order.referenceImage}} style={styles.detailedOrderImage} />
                       ) : (
                         <View style={{flex:1, backgroundColor: Colors.primary+'20', justifyContent:'center', alignItems:'center'}}>
                           <ShoppingBag size={24} color={Colors.primary}/>
                         </View>
                       )}
                    </View>
                    <View style={styles.detailedOrderInfo}>
                       <View style={styles.detailedOrderNameRow}>
                          <User size={14} color={Colors.textSecondary} />
                          <Text style={styles.detailedOrderName}>{customer.name}</Text>
                       </View>
                       <Text style={styles.detailedOrderNo}>Order No: #{order.orderId ? order.orderId.split('-').pop() : order._id.substring(order._id.length - 4)}</Text>
                       
                       <View style={styles.detailedOrderDressType}>
                         <Text style={{fontSize: 14}}>{getDressIcon(order.dressType)}</Text> 
                         <Text style={styles.detailedOrderDressText}>#{order.dressType} 1</Text>
                       </View>
                    </View>
                    <View style={styles.detailedOrderTopRight}>
                      <View style={styles.detailedOrderTag}>
                         <Tag size={12} color={Colors.primary} style={{marginRight: 4}}/>
                         <Text style={styles.detailedOrderTagText}>Stitching</Text>
                      </View>
                      <View style={[styles.detailedAcceptedBtn, { borderColor: Colors.primary, backgroundColor: Colors.primary+'10' }]}>
                         <Text style={[styles.detailedAcceptedBtnText, { color: Colors.primary }]}>{order.status}</Text>
                      </View>
                    </View>
                 </View>

                 <View style={styles.detailedOrderDates}>
                    <View style={styles.dateItem}>
                       <Calendar size={12} color={Colors.textSecondary} />
                       <Text style={styles.dateText}>Trial: {new Date(order.trialDate || order.deliveryDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</Text>
                    </View>
                    <View style={styles.dateItem}>
                       <Calendar size={12} color={Colors.textSecondary} />
                       <Text style={styles.dateText}>Delivery: {new Date(order.deliveryDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</Text>
                    </View>
                 </View>
                 <View style={styles.dateItemReceived}>
                    <Clock size={12} color={Colors.textSecondary} />
                    <Text style={styles.dateText}>Received: {new Date(order.createdAt).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</Text>
                 </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No records found!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    marginTop: 50,
    marginBottom: 20
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  scrollContent: { padding: Spacing.lg },
  
  mainCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadows.md, marginBottom: Spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  profileImageContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.lg, borderWidth: 2, borderColor: Colors.primary },
  profileImage: { width: '100%', height: '100%', borderRadius: 40 },
  initialsText: { color: Colors.white, fontSize: 26, fontWeight: 'bold' },
  nameSection: { flex: 1 },
  customerName: { fontSize: 22, fontWeight: 'bold', color: Colors.primary },
  mobileText: { fontSize: 16, color: Colors.textSecondary, marginVertical: 4 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.xl, paddingVertical: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  actionCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary+'10', justifyContent: 'center', alignItems: 'center' },
  
  detailsList: { gap: Spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  detailValue: { fontSize: 15, color: Colors.text, flex: 1 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, gap: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: Colors.background, paddingVertical: 12, paddingHorizontal: 4, borderRadius: BorderRadius.md, borderLeftWidth: 3 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold', marginVertical: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
  
  menuCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, ...Shadows.sm },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 17, fontWeight: '600', color: Colors.text },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md, gap: 4 },
  viewBtnText: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  
  dueSection: { marginTop: Spacing.sm, marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.md },
  
  // Detailed Order Card Styles (keeping original Colors)
  detailedOrderCard: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, ...Shadows.sm, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  detailedOrderTop: { flexDirection: 'row', marginBottom: Spacing.md },
  detailedOrderImagePlaceholder: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', marginRight: Spacing.md },
  detailedOrderImage: { width: '100%', height: '100%' },
  detailedOrderInfo: { flex: 1, justifyContent: 'space-between' },
  detailedOrderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailedOrderName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  detailedOrderNo: { fontSize: 12, color: Colors.textSecondary },
  detailedOrderDressType: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailedOrderDressText: { fontSize: 13, color: Colors.textSecondary },
  
  detailedOrderTopRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  detailedOrderTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  detailedOrderTagText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  detailedAcceptedBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  detailedAcceptedBtnText: { fontSize: 11, fontWeight: '600' },
  
  detailedOrderDates: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateItemReceived: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: Colors.textSecondary },
  
  emptyBox: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.md, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic' }
});
