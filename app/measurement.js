import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Image, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { ArrowLeft, Search } from 'lucide-react-native';

const OUTFIT_CATEGORIES = {
  Women: [
    { name: 'Crop Top', icon: '👚' },
    { name: 'Skirt', icon: '👗' },
    { name: 'Lehenga', icon: '👘' },
    { name: 'Top', icon: '👚' },
    { name: 'Kurti Top', icon: '🥻' },
    { name: 'Kurti Set', icon: '🥻' },
    { name: 'Blouse', icon: '👚' },
    { name: '3 Dart Blouse', icon: '👚' },
    { name: 'Princess Blouse', icon: '👚' },
    { name: 'Pattern Blouse', icon: '👚' },
    { name: 'Aari Blouse', icon: '✨' },
    { name: 'Machine Embroidery Blouse', icon: '🪡' },
    { name: 'Half Saree', icon: '🥻' },
    { name: 'Pleated Maxi', icon: '👗' },
    { name: 'Circular Maxi', icon: '👗' },
    { name: 'Feeding Maxi', icon: '👗' },
    { name: 'Feeding Top', icon: '👚' },
    { name: 'Mom & Daughter Combo', icon: '👩‍👧' },
    { name: 'Shirt / Crop Top', icon: '👔' },
  ],
  Men: [
    { name: 'Pant', icon: '👖' },
    { name: 'Shirt', icon: '👔' },
    { name: 'Kurta Set', icon: '👕' },
    { name: 'Aari Wedding Shirt', icon: '✨' },
  ],
  Kids: [
    { name: 'Kids Frock', icon: '👗' },
    { name: 'Pattu Pavadai', icon: '👘' },
    { name: 'Kids Maxi', icon: '👗' },
    { name: 'Kids Crop Top', icon: '👚' },
    { name: 'Kids Skirt', icon: '👗' },
    { name: 'Western Top', icon: '👚' },
    { name: 'Kids Aari / Machine Embroidery', icon: '✨' },
  ]
};

export default function MeasurementScreen() {
  const { customerId } = useLocalSearchParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Women');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
      const custData = response.data.customer;
      setCustomer(custData);
      
      // Auto-select category based on gender
      if (custData.gender === 'Male') {
        setSelectedCategory('Men');
      } else if (custData.gender === 'Female') {
        setSelectedCategory('Women');
      } else if (custData.gender === 'Kids') {
        setSelectedCategory('Kids');
      } else {
        setSelectedCategory('Women'); // Fallback
      }
    } catch (error) {
      console.error('Fetch error', error);
    } finally {
      setLoading(false);
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

  const filteredOutfits = OUTFIT_CATEGORIES[selectedCategory].filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Measurements</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Measurements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Customer Info Card */}
        {customer && (
          <View style={styles.customerCard}>
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
        )}



        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder={`Search ${selectedCategory} Outfits...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {/* Outfit Grid */}
        <View style={styles.gridContainer}>
          {filteredOutfits.map((outfit, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.outfitCard}
              onPress={() => router.push({ 
                pathname: '/outfit-measurements', 
                params: { 
                  customerId, 
                  outfitName: outfit.name, 
                  outfitIcon: outfit.icon 
                } 
              })}
            >
              <Text style={styles.outfitIcon}>{outfit.icon}</Text>
              <Text style={styles.outfitName} numberOfLines={2}>{outfit.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{height: 40}} />
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
  
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg, ...Shadows.sm },
  profileImageContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  profileImage: { width: '100%', height: '100%', borderRadius: 30 },
  initialsText: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  nameSection: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  mobileText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  
  categoryContainer: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: '#E9ECEF', borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
  categoryTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  categoryTabActive: { backgroundColor: Colors.white, ...Shadows.sm },
  categoryText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  categoryTextActive: { color: Colors.primary },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 15, color: Colors.text },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 12, justifyContent: 'space-between' },
  outfitCard: { width: '48%', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', ...Shadows.sm, marginBottom: 4 },
  outfitIcon: { fontSize: 32, marginBottom: 8 },
  outfitName: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'center' },
});
