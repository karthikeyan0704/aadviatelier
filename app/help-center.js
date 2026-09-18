import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { ArrowLeft, Phone, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function HelpCenterScreen() {
  const router = useRouter();

  const handleCall = () => Linking.openURL('tel:+917010916080');
  const handleEmail = () => Linking.openURL('mailto:aadviateiler@gmail.com');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.contactGrid}>
          <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
            <View style={[styles.iconWrapper, { backgroundColor: '#DCFCE7' }]}>
              <Phone size={24} color="#16A34A" />
            </View>
            <Text style={styles.contactTitle}>Call Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.iconWrapper, { backgroundColor: '#DBEAFE' }]}>
              <Mail size={24} color="#2563EB" />
            </View>
            <Text style={styles.contactTitle}>Email</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 20 }} />
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
    paddingBottom: Spacing.lg,
    borderRadius: 20,
    marginHorizontal: 10,
    marginTop: 15
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, marginRight: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.white },
  scrollContent: { padding: Spacing.lg },
  
  contactGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  contactCard: { flex: 0.48, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', ...Shadows.sm },
  iconWrapper: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  contactTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm }
});
