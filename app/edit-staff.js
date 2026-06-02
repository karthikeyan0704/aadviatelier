import React, { useState } from 'react';
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
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { User, Phone, Lock, Save, ArrowLeft, Camera, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import SuccessModal from '../components/SuccessModal';
import ConfirmModal from '../components/ConfirmModal';

export default function EditStaff() {
  const { id, staffData } = useLocalSearchParams();
  const parsedStaff = staffData ? JSON.parse(staffData) : {};
  
  const [name, setName] = useState(parsedStaff.name || '');
  const [mobileNumber, setMobileNumber] = useState(parsedStaff.mobileNumber || '');
  const [role, setRole] = useState(parsedStaff.role || 'admin');
  const [profilePicture, setProfilePicture] = useState(parsedStaff.profilePicture || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      try {
        const base64String = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setProfilePicture(`data:image/jpeg;base64,${base64String}`);
      } catch (error) {
        Alert.alert("Error", "Failed to process the image. Please try another one.");
      }
    }
  };

  const handleUpdateStaff = async () => {
    if (!mobileNumber) {
      Alert.alert('Error', 'Mobile Number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`${API_ENDPOINTS.STAFF}/${id}`, { name, mobileNumber, role, profilePicture });
      setSuccessModal({ visible: true, message: 'Staff updated successfully!' });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    setDeleteModalVisible(false);
    setIsSubmitting(true);
    try {
      await axios.delete(`${API_ENDPOINTS.STAFF}/${id}`);
      setSuccessModal({ visible: true, message: 'Staff deleted successfully!' });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete staff');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Staff</Text>
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
                  placeholder="Staff Name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Role</Text>
              <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
                {['admin', 'cutting_master', 'stitching_master'].map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary},
                      role === r ? {backgroundColor: Colors.primary} : {backgroundColor: 'transparent'}
                    ]}
                  >
                    <Text style={{color: role === r ? Colors.white : Colors.primary, fontWeight: 'bold', fontSize: 13}}>
                      {r.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, isSubmitting && styles.buttonDisabled]} 
              onPress={handleUpdateStaff}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Save size={20} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#FFEBEE', marginTop: Spacing.md }, isSubmitting && styles.buttonDisabled]} 
              onPress={handleDeleteStaff}
              disabled={isSubmitting}
            >
              <Trash2 size={20} color={Colors.error} style={{ marginRight: 8 }} />
              <Text style={[styles.buttonText, { color: Colors.error }]}>Delete Staff</Text>
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

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Staff"
        message={`Are you sure you want to permanently delete ${name || 'this staff member'}? This action cannot be undone.`}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={confirmDelete}
        confirmText="Delete"
        isDestructive={true}
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
  
  button: { backgroundColor: Colors.primary, height: 56, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg, ...Shadows.sm },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  avatarContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  cameraIconContainer: { position: 'absolute', bottom: 0, right: -5, backgroundColor: Colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white }
});
