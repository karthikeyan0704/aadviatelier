import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Modal
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, User, Phone, Mail, MapPin, Calendar, Contact as ContactIcon, Search, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import SuccessModal from '../components/SuccessModal';

// Using OpenStreetMap Nominatim for free autocomplete

export default function CreateCustomer() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });

  const [form, setForm] = useState({
    name: '',
    gender: 'Female',
    mobileNumber: '',
    email: '',
    dateOfBirth: new Date(),
    address: {
      fullAddress: '',
      houseLandmark: ''
    }
  });

  useEffect(() => {
    if (id) fetchCustomerForEdit();
  }, [id]);

  const fetchCustomerForEdit = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${id}`);
      const cust = response.data.customer;
      if (cust) {
        setForm({
          name: cust.name || '',
          gender: cust.gender || 'Female',
          mobileNumber: cust.mobileNumber || '',
          email: cust.email || '',
          dateOfBirth: cust.dateOfBirth ? new Date(cust.dateOfBirth) : new Date(),
          address: {
            fullAddress: cust.address?.fullAddress || '',
            houseLandmark: cust.address?.houseLandmark || ''
          }
        });
        if (cust.profileImage) {
          setProfileImage({ uri: cust.profileImage });
        }
      }
    } catch (err) {
      console.log('Fetch for edit failed', err);
      Alert.alert('Error', 'Failed to load customer data for editing');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setProfileImage(result.assets[0]);
  };

  const pickContact = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact) {
          const email = contact.emails?.[0]?.email || '';
          const phone = contact.phoneNumbers?.[0]?.number || '';
          let dob = form.dateOfBirth;
          if (contact.birthday) {
            const { day, month, year } = contact.birthday;
            dob = new Date(year || 1990, month - 1, day);
          }
          setForm(prev => ({
            ...prev,
            name: contact.name,
            mobileNumber: phone.replace(/[^0-9]/g, '').slice(-10),
            email: email,
            dateOfBirth: dob
          }));
        }
      } catch (e) {
        console.log('Cancelled');
      }
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
        { headers: { 'User-Agent': 'AadviAtelierApp/1.0' } }
      );
      setPredictions(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectPlace = (item) => {
    setForm(prev => ({ ...prev, address: { ...prev.address, fullAddress: item.display_name } }));
    setSearchModalVisible(false);
    setSearchQuery('');
    setPredictions([]);
  };

  const requestLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow location to fetch your current address.');
      return;
    }
    
    setSearchLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (reverse.length > 0) {
        const addr = reverse[0];
        // Construct a clean address string
        const parts = [
          addr.name,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode
        ].filter(p => p && p !== 'null' && p !== '');
        
        const full = parts.join(', ');
        setForm(prev => ({ ...prev, address: { ...prev.address, fullAddress: full } }));
        setSearchModalVisible(false); // Close modal after fetching location
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not get location. Make sure GPS is on.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.mobileNumber) {
      Alert.alert("Required Fields", "Please enter at least Name and Mobile Number");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('gender', form.gender);
      formData.append('mobileNumber', form.mobileNumber);
      formData.append('email', form.email);
      formData.append('dateOfBirth', form.dateOfBirth.toISOString());
      formData.append('address', JSON.stringify(form.address));

      if (profileImage) {
        formData.append('profileImage', {
          uri: profileImage.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });
      } else {
        formData.append('removeProfileImage', 'true');
      }

      if (id) {
        await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSuccessModal({ visible: true, message: 'Customer updated successfully!' });
      } else {
        await axios.post(API_ENDPOINTS.CUSTOMERS, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setSuccessModal({ visible: true, message: 'Customer created successfully!' });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{id ? 'Edit Customer' : 'Add New Customer'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.profileImageContainer} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage.uri }} style={styles.profileImg} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Camera size={32} color={Colors.textSecondary} />
                  <Text style={styles.uploadText}>Upload</Text>
                </View>
              )}
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity onPress={() => setProfileImage(null)} style={{marginTop: 10}}>
                <Text style={{color: Colors.error, fontSize: 13, fontWeight: 'bold'}}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name*</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter Name" 
                  value={form.name}
                  onChangeText={(v) => setForm({...form, name: v})}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender*</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Kids'].map((g) => (
                  <TouchableOpacity 
                    key={g} 
                    style={styles.radioContainer}
                    onPress={() => setForm({...form, gender: g})}
                  >
                    <View style={[styles.radio, form.gender === g && styles.radioActive]} />
                    <Text style={styles.radioLabel}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="10-digit Number" 
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.mobileNumber}
                  onChangeText={(v) => setForm({...form, mobileNumber: v})}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={pickContact} style={styles.contactIcon}>
                  <ContactIcon size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter Email (Optional)" 
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(v) => setForm({...form, email: v})}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
             <Text style={styles.label}>Address</Text>
             <TouchableOpacity 
                style={styles.addressDisplay} 
                onPress={() => setSearchModalVisible(true)}
             >
                <MapPin size={20} color={Colors.primary} />
                <Text style={[styles.addressText, !form.address.fullAddress && {color: '#999'}]} numberOfLines={1}>
                  {form.address.fullAddress || 'Search Address'}
                </Text>
                <Search size={20} color={Colors.primary} />
             </TouchableOpacity>

             <TextInput 
                style={styles.simpleInput} 
                placeholder="House Number/Landmark (Optional)" 
                value={form.address.houseLandmark}
                onChangeText={(v) => setForm({...form, address: {...form.address, houseLandmark: v}})}
                placeholderTextColor="#999"
              />
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, loading && styles.disabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Text style={styles.saveBtnText}>Save</Text>
                <ArrowLeft size={20} color={Colors.white} style={{ transform: [{ rotate: '180deg' }] }} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Search Modal */}
      <Modal visible={searchModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <TextInput
              autoFocus
              style={styles.modalSearchInput}
              placeholder="Type area or street (e.g. Sulur)..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.currentLocationBtn} onPress={requestLocation}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.currentLocationText}>Use Current Location</Text>
          </TouchableOpacity>

          {searchLoading && <ActivityIndicator style={{ marginVertical: 20 }} color={Colors.primary} />}

          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.predictionItem} onPress={() => selectPlace(item)}>
                <MapPin size={18} color={Colors.textSecondary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.predictionText} numberOfLines={1}>{item.display_name.split(',')[0]}</Text>
                  <Text style={styles.predictionSubText} numberOfLines={2}>{item.display_name}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={predictions.length > 0 ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ color: '#CCC', fontSize: 12 }}>powered by OpenStreetMap</Text>
              </View>
            ) : null}
          />
        </SafeAreaView>
      </Modal>

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
  container: { flex: 1, backgroundColor: Colors.background },
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
    marginTop:50,
    marginBottom:20
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  scrollContent: { padding: Spacing.lg },
  profileSection: { alignItems: 'center', marginBottom: Spacing.xl },
  profileImageContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%', borderRadius: 50 },
  profilePlaceholder: { alignItems: 'center' },
  uploadText: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  section: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 52, borderWidth: 1, borderColor: '#EEE' },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  genderRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: 4 },
  radioContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.primary },
  radioActive: { backgroundColor: Colors.primary, borderWidth: 6, borderColor: Colors.primary + '30' },
  radioLabel: { fontSize: 16, color: Colors.text },
  addressDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DDD', borderRadius: BorderRadius.md, padding: 12, marginBottom: Spacing.md },
  addressText: { flex: 1, marginHorizontal: 10, fontSize: 15 },
  simpleInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DDD', borderRadius: BorderRadius.md, padding: 12, fontSize: 15, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, height: 56, borderRadius:20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveBtnText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalSearchInput: { flex: 1, fontSize: 18, marginHorizontal: 15, color: Colors.text },
  predictionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  predictionText: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  predictionSubText: { fontSize: 12, color: Colors.textSecondary },
  currentLocationBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: Colors.primary + '05', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  currentLocationText: { marginLeft: 10, color: Colors.primary, fontWeight: 'bold' },
  contactIcon: { padding: 4 },
  errorBox: { padding: 20, alignItems: 'center' },
  errorText: { color: Colors.secondary, textAlign: 'center', fontSize: 14, fontStyle: 'italic' },
  disabled: { opacity: 0.7 }
});
