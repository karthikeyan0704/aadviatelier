import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Search, UserPlus, Trash2, Phone, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';
import SuccessModal from '../../components/SuccessModal';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });
  const router = useRouter();
  const { user } = useAuth();

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CUSTOMERS);
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch customers', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) || 
        c.mobileNumber.includes(query)
      );
      setFilteredCustomers(filtered);
    }
  };

  const handleDelete = (id, name) => {
    setCustomerToDelete({ id, name });
    setDeleteConfirmModal(true);
  };

  const confirmDeleteCustomer = async () => {
    setDeleteConfirmModal(false);
    if (!customerToDelete) return;
    
    try {
      await axios.delete(`${API_ENDPOINTS.CUSTOMERS}/${customerToDelete.id}`);
      fetchCustomers();
      setSuccessModal({ 
        visible: true, 
        title: 'Customer Deleted', 
        message: `${customerToDelete.name} has been successfully deleted.` 
      });
      setCustomerToDelete(null);
    } catch (error) {
      Alert.alert("Error", "Failed to delete customer");
      setCustomerToDelete(null);
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

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.customerCard}
      onPress={() => router.push({ pathname: '/customer-details', params: { id: item._id } })}
    >
      <View style={styles.profileImage}>
        <Text style={styles.initialsText}>{getInitials(item.name)}</Text>
      </View>
      
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <View style={styles.contactRow}>
          <Phone size={12} color={Colors.textSecondary} />
          <Text style={styles.contactText}>{item.mobileNumber}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {user?.role === 'owner' && (
          <TouchableOpacity onPress={() => handleDelete(item._id, item.name)} style={styles.deleteBtn}>
            <Trash2 size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        <ChevronRight size={20} color={Colors.border} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Header */}
      <View style={styles.header}>
        <Text style={styles.title}>All Customers</Text>
        <TouchableOpacity onPress={() => router.push('/create-customer')} style={styles.headerIcon}>
          <UserPlus size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.detailsSection}>
            <View style={styles.detailsRow}>
              <Text style={styles.subTitle}>Total Customers</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{filteredCustomers.length} Customers</Text>
              </View>
            </View>

            <View style={styles.searchBarContainer}>
              <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or mobile..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No records found</Text>
            </View>
          ) : null
        }
      />



      {loading && !refreshing && (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
      )}

      <ConfirmModal
        visible={deleteConfirmModal}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customerToDelete?.name}?`}
        onCancel={() => { setDeleteConfirmModal(false); setCustomerToDelete(null); }}
        onConfirm={confirmDeleteCustomer}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />

      <SuccessModal 
        visible={successModal.visible} 
        title={successModal.title}
        message={successModal.message} 
        onDone={() => setSuccessModal({ visible: false, title: '', message: '' })} 
      />
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
     marginTop: 15
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom:-6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  detailsSection: { 
    margin: Spacing.md, 
    padding: Spacing.lg, 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius.xl, 
    ...Shadows.md,
    marginBottom: Spacing.lg
  },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  subTitle: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  countBadge: { backgroundColor: Colors.primary + '10', paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.md },
  countText: { color: Colors.primary, fontWeight: 'bold', fontSize: 13 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 50 },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text },
  listContent: { paddingBottom: 100 },
  customerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.white, 
    padding: Spacing.md, 
    borderRadius: BorderRadius.md, 
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm, 
    ...Shadows.sm, 
    borderLeftWidth: 4, 
    borderLeftColor: Colors.primary 
  },
  profileImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  initialsText: { color: Colors.primary, fontWeight: 'bold', fontSize: 18 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 17, fontWeight: '600', color: Colors.text },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  contactText: { fontSize: 14, color: Colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  deleteBtn: { padding: 8 },

  emptyContainer: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary },
  loader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20 }
});
