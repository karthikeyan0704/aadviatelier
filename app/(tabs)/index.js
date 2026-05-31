import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { 
  Package, 
  Clock, 
  Scissors, 
  Sparkles, 
  CheckCircle, 
  CreditCard,
  Plus,
  User
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import StaffDashboard from '../../components/StaffDashboard';
import MasterDashboard from '../../components/MasterDashboard';

function OwnerDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchStats = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.DASHBOARD);
      setStats(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch stats', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const StatCard = ({ title, count, icon: Icon, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Icon size={24} color={Colors.secondary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardCount}>{count || 0}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.ownerName}>{user?.name || 'Aadvi Owner'}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
          {user?.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <User size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        
        <View style={styles.statsGrid}>
          <StatCard title="Today Deliveries" count={stats?.todayDeliveries} icon={Package} onPress={() => router.push('/(tabs)/orders')} />
          <StatCard title="Pending Orders" count={stats?.pendingOrders} icon={Clock} onPress={() => router.push('/(tabs)/orders')} />
          <StatCard title="Under Stitching" count={stats?.underStitching} icon={Scissors} onPress={() => router.push('/(tabs)/orders')} />
          <StatCard title="Aari Work Pending" count={stats?.aariWorkPending} icon={Sparkles} onPress={() => router.push('/(tabs)/orders')} />
          <StatCard title="Completed Orders" count={stats?.completedOrders} icon={CheckCircle} onPress={() => router.push('/(tabs)/orders')} />
          <StatCard title="Payment Pending" count={stats?.paymentPending} icon={CreditCard} onPress={() => router.push('/(tabs)/orders')} />
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/create-order')}>
            <Plus size={24} color={Colors.white} />
            <Text style={styles.actionButtonText}>Create New Order</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginTop: 15
  },
  welcomeText: { fontSize: 14, color: Colors.white, opacity: 0.8 },
  ownerName: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  profileBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20 ,marginBottom: -6},
  scrollContent: { padding: Spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, ...Shadows.sm, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm, backgroundColor: Colors.primary + '10' },
  cardContent: { flex: 1 },
  cardCount: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  cardTitle: { fontSize: 12, color: Colors.textSecondary },
  quickActions: { marginTop: Spacing.lg },
  actionButton: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: 20, ...Shadows.md },
  actionButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600', marginLeft: Spacing.sm },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <StaffDashboard />;
  }
  if (user?.role === 'cutting_master' || user?.role === 'stitching_master') {
    return <MasterDashboard />;
  }
  return <OwnerDashboard />;
}
