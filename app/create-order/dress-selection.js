import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';

const dressModels = {
  Kids: [
    'Kids Frock', 'Pattu Pavadai', 'Kids Maxi', 'Kids Crop Top', 'Kids Skirt', 'Western Top', 'Kids Aari / Machine Embroidery'
  ],
  Women: [
    'Crop Top', 'Skirt', 'Lehenga', 'Top', 'Kurti Top', 'Kurti Set', 'Blouse', '3 Dart Blouse', 'Princess Blouse', 
    'Pattern Blouse', 'Aari Blouse', 'Machine Embroidery Blouse', 'Half Saree', 'Pleated Maxi', 'Circular Maxi', 
    'Feeding Maxi', 'Feeding Top', 'Mom & Daughter Combo', 'Shirt / Crop Top'
  ],
  Men: [
    'Pant', 'Shirt', 'Kurta Set', 'Aari Wedding Shirt'
  ]
};

export default function DressSelection() {
  const router = useRouter();
  const { category, customerId } = useLocalSearchParams();
  const models = dressModels[category] || [];

  const handleSelect = (dressType) => {
    router.push({
      pathname: '/create-order/details',
      params: { category, dressType, customerId }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Select Dress Type</Text>
          <Text style={styles.subtitle}>{category} Collection</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {models.map((model, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.modelCard}
            onPress={() => handleSelect(model)}
          >
            <Text style={styles.modelName}>{model}</Text>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
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
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, marginBottom: -6 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  subtitle: { fontSize: 14, color: Colors.white, opacity: 0.8 },
  scrollContent: { padding: Spacing.lg },
  modelCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, ...Shadows.sm },
  modelName: { fontSize: 16, color: Colors.text, fontWeight: '500' }
});
