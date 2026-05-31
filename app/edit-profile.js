import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { User, Phone, Lock, Save, ArrowLeft, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import SuccessModal from '../components/SuccessModal';

export default function Profile() {
  const { user, updateUserSession, token } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [role, setRole] = useState(user?.role || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  const router = useRouter();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setMobileNumber(user.mobileNumber || '');
      setRole(user.role || '');
      setProfilePicture(user.profilePicture || null);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!mobileNumber) {
      Alert.alert('Error', 'Mobile Number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('mobileNumber', mobileNumber);

      if (profilePicture) {
        if (!profilePicture.startsWith('http')) {
          formData.append('profilePicture', {
            uri: profilePicture,
            type: 'image/jpeg',
            name: 'profile.jpg',
          });
        }
      } else {
        formData.append('removeProfilePicture', 'true');
      }

      const response = await fetch(API_ENDPOINTS.PROFILE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}` // Ensure token is passed since we bypass axios defaults
        },
        body: formData,
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update profile');
      }

      updateUserSession(responseData.user);
      setSuccessModal({ visible: true, message: 'Profile updated successfully!' });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage} style={{ position: 'relative', width: 100, height: 100 }}>
                <View style={[styles.avatarPlaceholder, { overflow: 'hidden' }]}>
                  {profilePicture ? (
                    <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
                  ) : (
                    <User size={40} color={Colors.primary} />
                  )}
                </View>
                <View style={styles.cameraIconContainer}>
                  <Camera size={16} color={Colors.white} />
                </View>
              </TouchableOpacity>
              {profilePicture && (
                <TouchableOpacity onPress={() => setProfilePicture(null)} style={{marginTop: 10}}>
                  <Text style={{color: Colors.error, fontSize: 13, fontWeight: 'bold'}}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={[styles.inputContainer, user?.role !== 'owner' && styles.disabledInput]}>
                <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, user?.role !== 'owner' && { color: Colors.textSecondary }]}
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  editable={user?.role === 'owner'}
                  placeholderTextColor="#999"
                />
              </View>
              {user?.role !== 'owner' && (
                <Text style={styles.helperText}>Contact owner to change mobile number.</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: Colors.textSecondary }]}
                  value={role.toUpperCase()}
                  editable={false}
                />
              </View>
              <Text style={styles.helperText}>Role cannot be changed.</Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, isSubmitting && styles.buttonDisabled]} 
              onPress={handleUpdateProfile}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Save size={20} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Update Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal 
        visible={successModal.visible} 
        message={successModal.message} 
        onDone={() => { 
          setSuccessModal({ visible: false, message: '' }); 
          router.back(); 
        }} 
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
    marginTop: 15,
    marginBottom: 20
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  
  scrollContainer: { padding: Spacing.xl },
  form: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, ...Shadows.md },
  
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 50, backgroundColor: Colors.background },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: '100%', color: Colors.text, fontSize: 16 },
  disabledInput: { backgroundColor: '#F0F0F0', borderColor: '#E0E0E0' },
  helperText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  
  button: { backgroundColor: Colors.primary, height: 56, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg, ...Shadows.sm },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  avatarContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  cameraIconContainer: { position: 'absolute', bottom: 0, right: -5, backgroundColor: Colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white }
});
