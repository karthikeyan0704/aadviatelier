import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { ArrowLeft, KeyRound, Smartphone, FileText, Fingerprint, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DevModal from '../components/DevModal';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const [appLock, setAppLock] = React.useState(false);
  const [devModal, setDevModal] = React.useState({ visible: false, title: '', message: '' });

  const SecurityItem = ({ icon: Icon, title, subtitle, onPress, toggle, value, onToggle }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
      <View style={styles.iconContainer}>
        <Icon size={22} color={Colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E5E7EB', true: Colors.primary }}
          thumbColor={Colors.white}
        />
      ) : (
        <ChevronRight size={20} color={Colors.border} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeader}>Security Settings</Text>
        <View style={styles.card}>
          <SecurityItem 
            icon={KeyRound} 
            title="Change Password" 
            subtitle="Update your account password"
            onPress={() => setDevModal({ visible: true, title: "Coming Soon", message: "The password change feature is currently under development." })}
          />
          <SecurityItem 
            icon={Fingerprint} 
            title="App Lock" 
            subtitle="Require Face ID / PIN to open app"
            toggle={true}
            value={appLock}
            onToggle={(val) => setAppLock(val)}
          />
        </View>

        <Text style={styles.sectionHeader}>Active Sessions</Text>
        <View style={styles.card}>
          <SecurityItem 
            icon={Smartphone} 
            title="Current Device" 
            subtitle="This Phone (Online)"
          />
        </View>

        <Text style={styles.sectionHeader}>Legal</Text>
        <View style={styles.card}>
          <SecurityItem 
            icon={FileText} 
            title="Privacy Policy" 
            onPress={() => setDevModal({ visible: true, title: "Under Construction", message: "Our Legal documents are currently being drafted and will be published here soon." })}
          />
          <SecurityItem 
            icon={FileText} 
            title="Terms of Service" 
            onPress={() => setDevModal({ visible: true, title: "Under Construction", message: "Our Legal documents are currently being drafted and will be published here soon." })}
          />
        </View>
      </ScrollView>

      <DevModal 
        visible={devModal.visible} 
        title={devModal.title} 
        message={devModal.message} 
        onDone={() => setDevModal({ visible: false, title: '', message: '' })} 
      />
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
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginVertical: Spacing.md },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.sm, marginBottom: Spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  itemSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 }
});
