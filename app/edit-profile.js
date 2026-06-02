import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { User, Phone, Lock, Save, ArrowLeft, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
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
  
  // USE REFS for base64 - refs survive across re-renders and never get lost
  const base64Ref = useRef(null);
  const hasPendingImage = useRef(false);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const uri = asset.uri;
        
        hasPendingImage.current = true;
        setProfilePicture(uri);

        let b64 = null;

        // Method 1: Use base64 directly from ImagePicker (most reliable)
        if (asset.base64 && asset.base64.length > 0) {
          b64 = asset.base64;
        }

        // Method 2: FileSystem fallback
        if (!b64) {
          try {
            b64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (fsError) {
            // FileSystem failed
          }
        }

        if (b64 && b64.length > 0) {
          base64Ref.current = b64;
          Alert.alert('Photo Selected', 'Remember to tap "Update Profile" to save your changes.');
        } else {
          Alert.alert('❌ Error', 'Could not read image data. Please try a different photo.');
          hasPendingImage.current = false;
          base64Ref.current = null;
        }
      }
    } catch (err) {
      Alert.alert('❌ Pick Error', err.message || 'Failed to pick image');
      hasPendingImage.current = false;
      base64Ref.current = null;
    }
  };

  // Sync from user context only when no pending image
  useEffect(() => {
    if (user && !hasPendingImage.current) {
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
      const payload = {
        name,
        mobileNumber,
      };

      // Read from ref instead of state
      const currentBase64 = base64Ref.current;

      if (currentBase64 && currentBase64.length > 0) {
        payload.profilePictureBase64 = `data:image/jpeg;base64,${currentBase64}`;
      } else if (!profilePicture) {
        payload.removeProfilePicture = 'true';
      }

      const res = await fetch(API_ENDPOINTS.PROFILE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (res.ok && responseData.user) {
        const newPicUrl = responseData.user.profilePicture;

        // Clear pending state
        hasPendingImage.current = false;
        base64Ref.current = null;
        
        // Set the new Cloudinary URL with cache-bust param
        if (newPicUrl) {
          const bustUrl = newPicUrl.includes('?') 
            ? `${newPicUrl}&_t=${Date.now()}` 
            : `${newPicUrl}?_t=${Date.now()}`;
          setProfilePicture(bustUrl);
        } else {
          setProfilePicture(null);
        }

        await updateUserSession(responseData.user);
        setSuccessModal({ visible: true, message: 'Profile updated successfully!' });
      } else {
        Alert.alert('Server Error', responseData.message || responseData.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build the image source with cache-busting for Cloudinary URLs
  const getImageSource = () => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith('file://') || profilePicture.startsWith('content://')) {
      return profilePicture;
    }
    if (profilePicture.includes('_t=')) {
      return profilePicture;
    }
    return `${profilePicture}?_t=${Date.now()}`;
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
                    <Image 
                      source={{ uri: getImageSource() }} 
                      style={styles.avatarImage}
                      cachePolicy="none"
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <User size={40} color={Colors.primary} />
                  )}
                </View>
                <View style={styles.cameraIconContainer}>
                  <Camera size={16} color={Colors.white} />
                </View>
              </TouchableOpacity>
              {profilePicture && (
                <TouchableOpacity onPress={() => { setProfilePicture(null); base64Ref.current = null; hasPendingImage.current = false; }} style={{marginTop: 10}}>
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
