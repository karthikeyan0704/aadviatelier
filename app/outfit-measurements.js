import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { ArrowLeft, Edit3, Trash2, Info } from 'lucide-react-native';

export default function OutfitMeasurements() {
  const { customerId, outfitName, outfitIcon } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  
  useFocusEffect(
    React.useCallback(() => {
      fetchCustomerDetails();
    }, [customerId])
  );

  const fetchCustomerDetails = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
      setCustomer(response.data.customer);
    } catch (error) {
      console.error('Fetch error', error);
      Alert.alert("Error", "Failed to fetch customer data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (measurementId) => {
    Alert.alert("Delete", "Are you sure you want to delete this measurement?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const updatedArray = customer.measurements[outfitName].filter(item => item.id !== measurementId);
          await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${customerId}/measurements`, {
            outfitName,
            measurements: updatedArray
          });
          fetchCustomerDetails(); // Refresh list
        } catch (error) {
          Alert.alert("Error", "Failed to delete measurement");
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>View Measurement</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Extract measurements if they exist (now an array)
  let outfitMeasurements = customer?.measurements?.[outfitName] || [];
  if (!Array.isArray(outfitMeasurements)) {
    // Fallback if data is still old object format
    if (Object.keys(outfitMeasurements).length > 0) {
      outfitMeasurements = [{ id: 'legacy', title: 'Measurement 1', date: new Date().toISOString(), details: outfitMeasurements }];
    } else {
      outfitMeasurements = [];
    }
  }
  const hasMeasurements = outfitMeasurements.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Measurement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Outfit Icon Card */}
        <View style={styles.iconCard}>
          <Text style={styles.largeIcon}>{outfitIcon}</Text>
          <Text style={styles.outfitTitle}>{outfitName}</Text>
        </View>

        {/* Add New Button Card */}
        <TouchableOpacity 
          style={styles.addCard}
          onPress={() => router.push({
            pathname: '/record-measurement',
            params: { customerId, outfitName, outfitIcon }
          })}
        >
          <Text style={styles.addCardTitle}>+ Add New {outfitName} Measurement</Text>
        </TouchableOpacity>

        {/* Measurements Display */}
        <View style={styles.measurementSection}>
          <Text style={styles.sectionTitle}>Saved Measurements</Text>
          
          {hasMeasurements ? (
            outfitMeasurements.map((item) => (
              <View key={item.id} style={styles.measurementCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={styles.actionBtnSmall}
                      onPress={() => router.push({
                        pathname: '/record-measurement',
                        params: { customerId, outfitName, outfitIcon, measurementId: item.id }
                      })}
                    >
                      <Edit3 size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnDeleteSmall} onPress={() => handleDelete(item.id)}>
                      <Trash2 size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {Object.entries(item.details || {})
                  .filter(([k, v]) => v && v.toString().trim() !== '')
                  .map(([key, value], index) => (
                  <View key={index} style={styles.measurementRow}>
                    <Text style={styles.measurementKey}>{key}</Text>
                    <Text style={styles.measurementValue}>{value}</Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Info size={32} color={Colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No measurements saved</Text>
            </View>
          )}
        </View>

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
  
  scrollContent: { padding: Spacing.lg },
  
  iconCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', ...Shadows.sm, marginBottom: Spacing.lg },
  largeIcon: { fontSize: 64, marginBottom: Spacing.sm },
  outfitTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text },

  addCard: { backgroundColor: Colors.primary + '15', padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.primary + '30', borderStyle: 'dashed' },
  addCardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },

  measurementSection: { marginTop: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.md },
  
  measurementCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.sm, marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  cardDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtnSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  actionBtnDeleteSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },

  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  measurementKey: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  measurementValue: { fontSize: 15, color: Colors.text, fontWeight: 'bold' },

  emptyBox: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  emptyText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '500' }
});
