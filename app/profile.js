import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Image
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { User, Phone, Lock, Edit2, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function ProfileDetails() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, user?.profilePicture && { backgroundColor: 'transparent' }]}>
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
              ) : (
                <User size={40} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userRole}>{user?.role?.replace('_', ' ').toUpperCase() || 'STAFF'}</Text>
          </View>

          <View style={styles.detailRow}>
            <User size={20} color={Colors.textSecondary} style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Phone size={20} color={Colors.textSecondary} style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Mobile Number</Text>
              <Text style={styles.detailValue}>{user?.mobileNumber || 'Not set'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Lock size={20} color={Colors.textSecondary} style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{user?.role?.replace('_', ' ').toUpperCase() || 'Not set'}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => router.push('/edit-profile')}
          >
            <Edit2 size={20} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  
  scrollContainer: { padding: Spacing.xl },
  card: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, ...Shadows.md },
  
  avatarContainer: { alignItems: 'center', marginBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  userName: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  userRole: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, letterSpacing: 1 },

  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  detailIcon: { marginRight: Spacing.md },
  detailLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  detailValue: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  
  editButton: { backgroundColor: Colors.primary, height: 56, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg, ...Shadows.sm },
  editButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' }
});
