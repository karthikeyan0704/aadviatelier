import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, Scissors, FileText, Sparkles, User, LogOut, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ConfirmModal from './ConfirmModal';
import SuccessModal from './SuccessModal';

export default function MasterDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Active');
  const [confirmModal, setConfirmModal] = useState({ visible: false, orderId: null, stepIndex: null, stepName: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.ORDERS}/staff-orders`);
      setOrders(response.data);
    } catch (error) {
      console.log('Failed to fetch orders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const handleUpdateStep = (orderId, stepIndex, stepName) => {
    setConfirmModal({ visible: true, orderId, stepIndex, stepName });
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmUpdateStep = async () => {
    const { orderId, stepIndex, stepName } = confirmModal;
    setConfirmModal({ visible: false, orderId: null, stepIndex: null, stepName: '' });
    try {
      await axios.put(`${API_ENDPOINTS.ORDERS}/workflow`, { orderId, stepIndex, status: 'Completed' });
      fetchOrders();
      setSuccessModal({ visible: true, message: `"${stepName}" has been marked as DONE!` });
    } catch (e) {
      Alert.alert('Error', 'Failed to update. Check your connection.');
    }
  };

  const getRelevantSteps = (workflow) => {
    if (user?.role === 'cutting_master') {
      return workflow.map((w, i) => ({...w, index: i})).filter(w => ['Marking', 'Cutting'].includes(w.step));
    } else {
      return workflow.map((w, i) => ({...w, index: i})).filter(w => ['Stitching', 'Aari Work / Embroidery', 'Hook and Hem'].includes(w.step));
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const visibleOrders = orders.filter(order => {
    const steps = getRelevantSteps(order.workflow);
    const allDone = steps.every(s => s.status === 'Completed');
    return !(allDone && steps.length > 0);
  });

  const historyOrders = orders.filter(order => {
    const steps = getRelevantSteps(order.workflow);
    if (steps.length === 0) return false;
    return steps.every(s => s.status === 'Completed');
  });

  const displayOrders = activeTab === 'Active' ? visibleOrders : historyOrders;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={styles.avatar}>
            {user?.profilePicture ? (
              <Image source={{uri: user.profilePicture}} style={{width: 50, height: 50, borderRadius: 25}} />
            ) : (
              <User size={30} color={Colors.primary} />
            )}
          </View>
          <View style={{marginLeft: 15}}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{user?.name || 'Master'}</Text>
            <Text style={styles.roleText}>{user?.role === 'cutting_master' ? 'CUTTING MASTER' : 'STITCHING MASTER'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'Active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('Active')}
        >
          <Text style={[styles.tabText, activeTab === 'Active' && styles.tabTextActive]}>My Work ({visibleOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'History' && styles.tabBtnActive]}
          onPress={() => setActiveTab('History')}
        >
          <Text style={[styles.tabText, activeTab === 'History' && styles.tabTextActive]}>History ({historyOrders.length})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayOrders}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{activeTab === 'Active' ? 'No work assigned right now.' : 'No completed work history.'}</Text>
          </View>
        }
        renderItem={({ item: order }) => {
          const steps = getRelevantSteps(order.workflow);
          const isOverdue = activeTab === 'Active' && order.deliveryDate && new Date(order.deliveryDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);

          return (
            <TouchableOpacity 
              style={[styles.card, isOverdue && { borderColor: Colors.error, borderWidth: 2 }]}
              onPress={() => router.push(`/order-details?id=${order._id}`)}
            >
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <AlertTriangle size={14} color={Colors.white} />
                  <Text style={styles.overdueText}>OVERDUE</Text>
                </View>
              )}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.customerName}>{order.customer?.name}</Text>
                  <Text style={styles.dressType}>{order.category} - {order.dressType}</Text>
                </View>
                <Text style={styles.orderId}>{order.orderId.split('-').pop()}</Text>
              </View>

              {order.referenceImage && (
                 <Image source={{uri: order.referenceImage}} style={styles.refImage} />
              )}

              <View style={styles.tasksContainer}>
                {steps.map(step => (
                  <TouchableOpacity 
                    key={step.index} 
                    style={[styles.taskBtn, step.status === 'Completed' ? styles.taskDone : styles.taskPending]}
                    onPress={() => step.status !== 'Completed' && handleUpdateStep(order._id, step.index, step.step)}
                    disabled={step.status === 'Completed'}
                  >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      {step.step.includes('Cutting') || step.step.includes('Stitching') || step.step.includes('Hook') ? <Scissors size={20} color={step.status === 'Completed' ? Colors.success : Colors.error} style={{marginRight: 10}} /> :
                       step.step.includes('Aari') ? <Sparkles size={20} color={step.status === 'Completed' ? Colors.success : Colors.error} style={{marginRight: 10}} /> :
                       <FileText size={20} color={step.status === 'Completed' ? Colors.success : Colors.error} style={{marginRight: 10}} />}
                      <Text style={[styles.taskText, {color: step.status === 'Completed' ? Colors.success : Colors.error}]}>{step.step.toUpperCase()}</Text>
                    </View>
                    {step.status === 'Completed' ? <CheckCircle size={24} color={Colors.success} /> : <Clock size={24} color={Colors.error} />}
                  </TouchableOpacity>
                ))}
                {steps.length === 0 && (
                  <Text style={{color: Colors.textSecondary, fontStyle: 'italic'}}>No tasks for your role in this order.</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <ConfirmModal
        visible={confirmModal.visible}
        title="Complete Task"
        message={`Mark "${confirmModal.stepName}" as DONE?`}
        onCancel={() => setConfirmModal({ visible: false, orderId: null, stepIndex: null, stepName: '' })}
        onConfirm={confirmUpdateStep}
        confirmText="Yes, Done"
        cancelText="No"
        isDestructive={false}
      />

      <SuccessModal 
        visible={successModal.visible} 
        message={successModal.message} 
        onDone={() => setSuccessModal({ visible: false, message: '' })} 
      />

      <ConfirmModal
        visible={logoutModalVisible}
        title="Logout"
        message="Are you sure you want to log out?"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={() => {
          setLogoutModalVisible(false);
          logout();
        }}
        confirmText="Logout"
        cancelText="Cancel"
        isDestructive={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: Spacing.xl, 
    backgroundColor: Colors.primary, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Shadows.md,
    marginBottom: Spacing.md
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  welcomeText: { color: Colors.white, fontSize: 14, opacity: 0.8 },
  userName: { color: Colors.white, fontSize: 24, fontWeight: 'bold' },
  roleText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  logoutBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, ...Shadows.sm, marginBottom: Spacing.sm },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },

  scrollContent: { padding: Spacing.md },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, color: '#777', fontWeight: 'bold' },
  
  card: { backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.md },
  overdueBadge: { flexDirection: 'row', backgroundColor: Colors.error, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', alignItems: 'center', marginBottom: 10, gap: 4 },
  overdueText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  customerName: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  dressType: { fontSize: 16, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  orderId: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, backgroundColor: Colors.primary+'15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  
  refImage: { width: '100%', height: 150, borderRadius: 15, marginBottom: 15 },
  
  tasksContainer: { gap: 12 },
  taskBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 2 },
  taskPending: { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  taskDone: { borderColor: '#C8E6C9', backgroundColor: '#E8F5E9' },
  taskText: { fontSize: 18, fontWeight: 'bold' }
});
