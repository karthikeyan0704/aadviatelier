import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Shield, Bell, HelpCircle, ChevronRight, Users, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import SuccessModal from '../../components/SuccessModal';
import ConfirmModal from '../../components/ConfirmModal';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = React.useState(false);

  const handleLogoutPress = () => {
    setLogoutModalVisible(true);
  };

  const SettingItem = ({ icon: Icon, title, onPress, color = Colors.text }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} />
      </View>
      <Text style={[styles.itemText, { color }]}>{title}</Text>
      <ChevronRight size={18} color={Colors.border} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/edit-profile')}>
          <View style={[styles.avatar, user?.profilePicture && { backgroundColor: 'transparent' }]}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={{ width: 60, height: 60, borderRadius: 30 }} />
            ) : (
              <User size={32} color={Colors.white} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || user?.mobileNumber || 'Admin'}</Text>
            <Text style={styles.userRole}>{user?.role?.replace('_', ' ').toUpperCase() || 'OWNER'}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem icon={Shield} title="Privacy & Security" />
          <SettingItem icon={Bell} title="Notifications" />
        </View>

        {(user?.role === 'owner' || user?.role === 'admin') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Management</Text>
            <SettingItem 
              icon={UserPlus} 
              title="Add New Staff" 
              onPress={() => router.push('/add-staff')} 
            />
            <SettingItem 
              icon={Users} 
              title="Staff List" 
              onPress={() => router.push('/staff-list')} 
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem icon={HelpCircle} title="Help Center" />
          <SettingItem icon={LogOut} title="Logout" color={Colors.error} onPress={handleLogoutPress} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Aadvi Boutique v1.0.0</Text>
        </View>
      </ScrollView>

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
  header: { 
    padding: Spacing.lg, 
    backgroundColor: Colors.primary, 
    ...Shadows.sm,
    paddingBottom: Spacing.xl,
    borderRadius: 20,
    marginHorizontal: 10,
     marginTop: 15
 
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom:-6 },
  scrollContent: { padding: Spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  userName: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  userRole: { fontSize: 12, color: Colors.secondary, fontWeight: 'bold', letterSpacing: 1 },
  section: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  itemText: { flex: 1, fontSize: 16, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: Spacing.xl },
  version: { color: Colors.textSecondary, fontSize: 12 }
});
