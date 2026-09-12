import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { ArrowLeft, Phone, Search, Calendar, ChevronRight } from 'lucide-react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ViewOrder() {
  const { customerId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  const fetchCustomerDetails = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
      setData(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomerDetails(true);
  }, [customerId]);

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

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{flex: 1}} />
      </SafeAreaView>
    );
  }

  const { customer, orders } = data || { customer: {}, orders: [] };

  const isStaff = user?.role === 'cutting_master' || user?.role === 'stitching_master';
  const visibleOrders = isStaff && orderSearch.trim()
    ? orders.filter(order => order.orderId?.toLowerCase().includes(orderSearch.trim().toLowerCase()))
    : orders;

  const getStatusStyle = (status) => {
    if (status === 'Delivered' || status === 'Completed') {
      return { backgroundColor: '#DDF5E9', color: '#14864A' };
    }
    if (status === 'In Progress') {
      return { backgroundColor: '#FFF0C9', color: '#9A6500' };
    }
    return { backgroundColor: '#FFE2E7', color: '#C51F4B' };
  };

  const getOrderDate = (order) => {
    const date = order.deliveryDate || order.createdAt;
    return date ? new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : '';
  };

  const getInitial = (name) => name?.trim()?.charAt(0)?.toUpperCase() || '?';

  const renderOrderRow = ({ item }) => (
    <TouchableOpacity 
      style={styles.tableRow}
      onPress={() => router.push({ pathname: '/order-details', params: { id: item._id } })}
    >
      <Text style={[styles.cellText, {flex: 1.2}]} numberOfLines={1}>{customer.name}</Text>
      <Text style={[styles.cellText, {flex: 1.5, textAlign: 'center'}]} numberOfLines={1}>{item.orderId || item._id}</Text>
      {!isStaff && (
        <Text style={[styles.cellText, {flex: 1, textAlign: 'right'}]} numberOfLines={1}>₹{item.billing?.estimatedCost || 0}</Text>
      )}
    </TouchableOpacity>
  );

  const renderMasterOrderRow = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.masterOrderRow}
        onPress={() => router.push({ pathname: '/order-details', params: { id: item._id } })}
      >
        <View style={styles.masterAvatar}>
          <Text style={styles.masterAvatarText}>{getInitial(customer.name)}</Text>
        </View>
        <View style={styles.masterOrderInfo}>
          <Text style={styles.masterCustomerName} numberOfLines={1}>{customer.name}</Text>
          <View style={styles.masterDateRow}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.masterDate}>{getOrderDate(item)}</Text>
          </View>
        </View>
        <View style={styles.masterOrderMeta}>
          <Text style={styles.masterOrderId} numberOfLines={2}>{item.orderId || item._id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{item.status || 'Pending'}</Text>
          </View>
        </View>
        <ChevronRight size={24} color={Colors.primary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Purple Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerIcon, { marginRight: 12 }]}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
          </View>
          
          <View style={styles.nameBlock}>
            <Text style={styles.nameText}>{customer.name}</Text>
            <Text style={styles.phoneText}>{customer.mobileNumber}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleCall} style={[styles.headerIcon, { marginRight: 8 }]}>
            <Phone size={20} color={Colors.white} fill={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWhatsApp} style={styles.headerIcon}>
            <FontAwesome name="whatsapp" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Card */}
      <View style={styles.tableCard}>
        {isStaff && (
          <View style={styles.searchBar}>
            <Search size={24} color={Colors.textSecondary} />
            <TextInput
              style={styles.orderSearch}
              placeholder="Search full order number"
              placeholderTextColor={Colors.textSecondary}
              value={orderSearch}
              onChangeText={setOrderSearch}
              autoCapitalize="none"
            />
          </View>
        )}

        {/* Blue Header Bar */}
        <View style={[styles.tableHeaderBar, isStaff && styles.masterTableHeaderBar]}>
          <Text style={[styles.tableHeaderText, isStaff && styles.masterTableHeaderText, {flex: 1.2}]}>Customer Name</Text>
          <Text style={[styles.tableHeaderText, isStaff && styles.masterTableHeaderText, {flex: 1.5, textAlign: 'center'}]}>Order No</Text>
          {!isStaff && (
            <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Amount</Text>
          )}
        </View>

        {/* Order List */}
        <FlatList
          style={{ flex: 1 }}
          data={visibleOrders}
          renderItem={isStaff ? renderMasterOrderRow : renderOrderRow}
          keyExtractor={(item) => item._id}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          contentContainerStyle={[
            styles.listContent,
            isStaff && styles.masterListContent,
            { paddingBottom: 20 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No Record Found!</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

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
    marginTop: 50,
    marginBottom: 20
  },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: Colors.white, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12,
    marginBottom: -6
  },
  avatarText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  nameBlock: { justifyContent: 'center', marginBottom: -6 },
  nameText: { fontSize: 16, color: Colors.white, fontWeight: 'bold' },
  phoneText: { fontSize: 13, color: Colors.white, opacity: 0.9, marginTop: 2 },
  
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  tableCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 10,
    marginBottom: Spacing.lg,
    borderRadius: 20,
    ...Shadows.md,
    overflow: 'hidden',
    flex: 1
  },

  orderSearch: {
    flex: 1,
    paddingHorizontal: 12,
    height: 44,
    color: Colors.text,
    fontSize: 16
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E3E6F5',
    borderRadius: 16,
    backgroundColor: '#F7F7FF',
    overflow: 'hidden'
  },

  tableHeaderBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primary, // Using theme color instead of hardcoded
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center'
  },
  masterTableHeaderBar: {
    marginHorizontal: 10,
    borderRadius: 14,
    paddingVertical: 14
  },
  tableHeaderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold'
  },

  listContent: {
    flexGrow: 1
  },
  masterListContent: {
    flexGrow: 0
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center'
  },
  masterOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 118,
    marginHorizontal: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E8EAF4',
    ...Shadows.sm
  },
  masterAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  masterAvatarText: { fontSize: 24, fontWeight: 'bold', color: '#1769E0' },
  masterOrderInfo: { flex: 1, minWidth: 0, marginRight: 5 },
  masterCustomerName: { fontSize: 19, fontWeight: 'bold', color: '#111A42' },
  masterDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 7, flexShrink: 0 },
  masterDate: { fontSize: 13, color: Colors.textSecondary, flexShrink: 0 },
  masterOrderMeta: { width: 135, marginLeft: 5, flexShrink: 0 },
  masterOrderId: { fontSize: 14, lineHeight: 18, fontWeight: 'bold', color: '#111A42', textAlign: 'right', flexShrink: 1 },
  masterTableHeaderText: { fontSize: 16 },
  statusBadge: { alignSelf: 'flex-end', marginTop: 7, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 18, maxWidth: '100%' },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  cellText: {
    fontSize: 14,
    color: Colors.text
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text
  }
});
