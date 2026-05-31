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
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Search, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Active', 'Past Due', 'Upcoming', 'Pending Amount', 'Delivered', 'Draft'];

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Active');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ORDERS);
      setOrders(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch orders', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const getCounts = () => {
    const today = new Date();
    today.setHours(0,0,0,0);

    return {
      'Active': orders.filter(o => o.status !== 'Delivered' && o.status !== 'Draft').length,
      'Past Due': orders.filter(o => o.status !== 'Delivered' && new Date(o.deliveryDate).setHours(0,0,0,0) < today.getTime()).length,
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
        case 'Past Due': matchesTab = !isDelivered && deliveryDate.getTime() < today.getTime(); break;
        case 'Upcoming': matchesTab = !isDelivered && deliveryDate.getTime() >= today.getTime(); break;
        case 'Pending Amount': matchesTab = order.billing?.balanceDue > 0; break;
        case 'Delivered': matchesTab = isDelivered; break;
        case 'Draft': matchesTab = isDraft; break;
      }

      if (!matchesTab) return false;

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

  const filteredOrders = getFilteredOrders();

  const isStaff = user?.role === 'cutting_master' || user?.role === 'stitching_master';
  const visibleTabs = isStaff ? TABS.filter(t => t !== 'Pending Amount') : TABS;

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tableRow}
      onPress={() => router.push({ pathname: '/order-details', params: { id: item._id } })}
    >
      <View style={[styles.rowCol, {flex: 1.2}]}>
        <Text style={styles.cellText} numberOfLines={1}>{item.customer?.name || 'Unknown'}</Text>
      </View>
      <View style={[styles.rowCol, {flex: 1}]}>
        <Text style={[styles.cellText, {textAlign: 'center'}]} numberOfLines={1}>{item.orderId?.split('-').pop() || item.orderId}</Text>
      </View>
      {!isStaff && (
      <View style={[styles.rowCol, {flex: 1, borderRightWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}]}>
        <Text style={styles.cellText} numberOfLines={1}>{item.billing?.estimatedCost || 0}</Text>
        <ChevronRight size={16} color={Colors.textSecondary} style={{marginLeft: 4}} />
      </View>
      )}
    </TouchableOpacity>
  );

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
                placeholder="Search name, phone or ID..."
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
                onPress={() => setActiveTab(tab)}
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
          <View style={[styles.headerCol, {flex: 1.2}]}>
            <Text style={[styles.tableHeaderText, {textAlign: 'left'}]}>Customer Name</Text>
          </View>
          <View style={[styles.headerCol, {flex: 1}]}>
            <Text style={[styles.tableHeaderText, {textAlign: 'center'}]}>Order No</Text>
          </View>
          {!isStaff && (
          <View style={[styles.headerCol, {flex: 1, borderRightWidth: 0, alignItems: 'flex-end'}]}>
            <Text style={[styles.tableHeaderText, {textAlign: 'right', paddingRight: 2}]}>Amount</Text>
          </View>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No Record Found!</Text>
              </View>
            ) : null
          }
        />
      </View>
      
      {loading && !refreshing && (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
      )}
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
    gap: Spacing.md
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
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold'
  },

  listContent: { flexGrow: 1, paddingBottom: 10 },
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
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500'
  },
  
  empty: { padding: Spacing.xl, alignItems: 'center', marginTop: 40 },
  emptyText: { color: Colors.text, fontSize: 16 },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18 }
});
