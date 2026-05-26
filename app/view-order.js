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
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { ArrowLeft, Phone } from 'lucide-react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ViewOrder() {
  const { customerId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderOrderRow = ({ item }) => (
    <TouchableOpacity 
      style={styles.tableRow}
      onPress={() => router.push({ pathname: '/order-details', params: { id: item._id } })}
    >
      <Text style={[styles.cellText, {flex: 1.2}]} numberOfLines={1}>{customer.name}</Text>
      <Text style={[styles.cellText, {flex: 1.5, textAlign: 'center'}]} numberOfLines={1}>{item.orderId ? item.orderId.split('-').pop() : item._id.substring(item._id.length - 4)}</Text>
      {!isStaff && (
        <Text style={[styles.cellText, {flex: 1, textAlign: 'right'}]} numberOfLines={1}>₹{item.billing?.estimatedCost || 0}</Text>
      )}
    </TouchableOpacity>
  );

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
        {/* Blue Header Bar */}
        <View style={styles.tableHeaderBar}>
          <Text style={[styles.tableHeaderText, {flex: 1.2}]}>Customer Name</Text>
          <Text style={[styles.tableHeaderText, {flex: 1.5, textAlign: 'center'}]}>Order No</Text>
          {!isStaff && (
            <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>Amount</Text>
          )}
        </View>

        {/* Order List */}
        <FlatList
          style={{ flex: 1 }}
          data={orders}
          renderItem={renderOrderRow}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
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

  tableHeaderBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primary, // Using theme color instead of hardcoded
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center'
  },
  tableHeaderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold'
  },

  listContent: {
    flexGrow: 1
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center'
  },
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
