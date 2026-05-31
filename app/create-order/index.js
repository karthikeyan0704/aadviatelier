import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';

export default function CreateOrderFlow() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // If we receive a customer directly (e.g. from customer profile), instantly skip
    if (params.customerId) {
      let category = 'Women'; // Default
      if (params.customerGender === 'Male') category = 'Men';
      else if (params.customerGender === 'Female') category = 'Women';
      else if (params.customerGender === 'Kids') category = 'Kids';
      
      router.replace({
        pathname: '/create-order/dress-selection',
        params: { category, customerId: params.customerId }
      });
    } else {
      fetchCustomers();
    }
  }, [params.customerId, params.customerGender]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CUSTOMERS);
      setCustomers(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.mobileNumber.includes(searchQuery)
  );

  // If customerId is provided, we are redirecting, so show loading
  if (params.customerId) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Customer</Text>
        <Text style={styles.subtitle}>Who is this order for?</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {filteredCustomers.map((c) => (
            <TouchableOpacity 
              key={c._id} 
              style={styles.customerCard}
              onPress={() => {
                let category = 'Women';
                if (c.gender === 'Male') category = 'Men';
                else if (c.gender === 'Female') category = 'Women';
                else if (c.gender === 'Kids') category = 'Kids';
                
                router.push({
                  pathname: '/create-order/dress-selection',
                  params: { category, customerId: c._id }
                });
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {c.name.substring(0,2).toUpperCase()}
                </Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.customerName}>{c.name}</Text>
                <Text style={styles.customerPhone}>{c.mobileNumber}</Text>
              </View>
              <ChevronRight size={20} color={Colors.primary} />
            </TouchableOpacity>
          ))}
          
          {filteredCustomers.length === 0 && (
            <View style={{alignItems: 'center', marginTop: 40}}>
              <Text style={{color: Colors.textSecondary}}>No customers found.</Text>
              <TouchableOpacity 
                style={{marginTop: 12, padding: 8}}
                onPress={() => router.push('/(tabs)/customers')}
              >
                <Text style={{color: Colors.primary, fontWeight: 'bold'}}>+ Create New Customer</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    padding: Spacing.lg, 
    backgroundColor: Colors.primary, 
    ...Shadows.sm,
    paddingBottom: Spacing.xl,
    borderRadius: 20,
    marginHorizontal: 10,
    marginTop: 50,
    marginBottom: 20
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  subtitle: { fontSize: 14, color: Colors.white, opacity: 0.8, marginTop: 10 },
  
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.white, 
    margin: Spacing.lg, 
    marginBottom: 0,
    paddingHorizontal: Spacing.md, 
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: Colors.text },

  scrollContent: { padding: Spacing.lg },

  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, ...Shadows.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  customerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  customerPhone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  
  footer: { padding: Spacing.lg, paddingBottom: 30, backgroundColor: 'transparent' },
  cancelButton: { 
    backgroundColor: Colors.white, 
    borderRadius: 20, 
    alignItems: 'center', 
    padding: 16,
    ...Shadows.sm,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FFEBEB'
  },
  cancelText: { color: Colors.error, fontWeight: 'bold', fontSize: 16 }
});
