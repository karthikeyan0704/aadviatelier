import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { User, Edit2, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchStaff = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.STAFF);
      setStaff(response.data);
    } catch (error) {
      console.error('Failed to fetch staff', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStaff();
  }, []);

  const renderStaffItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
        ) : (
          <User size={32} color={Colors.white} />
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name || 'Staff'}</Text>
        <Text style={styles.email}>{item.mobileNumber}</Text>
        <Text style={styles.role}>{item.role.replace('_', ' ').toUpperCase()}</Text>
      </View>
      <TouchableOpacity 
        style={styles.editButton} 
        onPress={() => router.push({ pathname: '/edit-staff', params: { id: item._id, staffData: JSON.stringify(item) } })}
      >
        <Edit2 size={18} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff List</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item._id}
          renderItem={renderStaffItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No staff members found.</Text>
            </View>
          }
        />
      )}
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
    marginTop: 15,
    marginBottom: 20
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  
  listContent: { padding: Spacing.lg, paddingTop: 0 },
  card: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: Spacing.md, ...Shadows.sm, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  infoContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  email: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  role: { fontSize: 10, color: Colors.primary, fontWeight: 'bold', marginTop: 4, letterSpacing: 0.5 },
  editButton: { padding: Spacing.sm, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.md },
  
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 }
});
