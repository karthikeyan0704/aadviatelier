import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Scissors, CheckCircle, Clock, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function StaffDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const fetchOrders = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.STAFF_ORDERS);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch staff orders', error);
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

  const renderOrderItem = ({ item }) => {
    const currentStepIndex = item.workflow.findIndex(s => s.status === 'Pending');
    const currentStep = currentStepIndex !== -1 ? item.workflow[currentStepIndex].step : 'Completed';
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => router.push({ pathname: '/order-details', params: { id: item._id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order ID:{item.orderId?.slice(-4)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'Delivered' ? '#E8F5E9' : Colors.primary + '15' }]}>
            <Text style={[styles.statusText, { color: item.status === 'Delivered' ? '#2E7D32' : Colors.primary }]}>
              {item.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.customerName}>{item.customer?.name || 'Unknown'}</Text>
          <Text style={styles.dressType}>{item.category} • {item.dressType}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.workflowInfo}>
            {currentStep === 'Completed' ? (
              <CheckCircle size={16} color="#2E7D32" />
            ) : (
              <Clock size={16} color={Colors.secondary} />
            )}
            <Text style={styles.stepText}>{currentStep}</Text>
          </View>
          <Text style={styles.dateText}>Due: {new Date(item.deliveryDate).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{user?.name || user?.mobileNumber || 'Admin'}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
          {user?.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <User size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Scissors size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>{orders.filter(o => o.status !== 'Delivered').length}</Text>
          <Text style={styles.statLabel}>Active Tasks</Text>
        </View>
        <View style={styles.statBox}>
          <CheckCircle size={24} color="#2E7D32" />
          <Text style={styles.statNumber}>{orders.filter(o => o.status === 'Delivered').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Assigned Orders</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders assigned to you yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.xl, backgroundColor: Colors.primary, paddingBottom: 30, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { color: Colors.white, fontSize: 16, opacity: 0.8 },
  nameText: { color: Colors.secondary, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  profileBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20 },
  
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginTop: -20, gap: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadows.sm, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginVertical: 8 },
  statLabel: { fontSize: 13, color: Colors.textSecondary },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.md },
  
  listContent: { padding: Spacing.lg, paddingTop: 0 },
  orderCard: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  orderId: { fontWeight: 'bold', color: Colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  cardBody: { marginBottom: Spacing.sm },
  customerName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  dressType: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  workflowInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepText: { fontSize: 13, fontWeight: '500', color: Colors.text },
  dateText: { fontSize: 12, color: Colors.textSecondary },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 }
});
