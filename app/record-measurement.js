import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import SuccessModal from '../components/SuccessModal';
import { ArrowLeft, Camera, Check, UploadCloud } from 'lucide-react-native';

const OUTFIT_FIELDS_MAP = {
  'Pant': ['Model', 'Length', 'Hip', 'Waist Round', 'Thigh Round', 'Knee Round', 'Ankle Round', 'Fitting'],
  'Blouse': ['Full Length', 'Shoulder', 'Back Neck', 'Front Neck', 'Armhole', 'Sleeve Length', 'Sleeve Round', 'Upper chest', 'Chest', 'Waist', 'B.Point', 'Under Bust', 'Fitting'],
  'Chudidhar': ['Full Length', 'Shoulder', 'Back Neck', 'Front Neck', 'Armhole', 'Sleeve Length', 'Sleeve Round', 'Upper Chest', 'Chest', 'Waist', 'Hip', 'Slit Length', 'Fitting'],
  'Default': ['Full Length', 'Shoulder', 'Chest', 'Waist', 'Hip', 'Fitting']
};

export default function RecordMeasurement() {
  const { customerId, outfitName, outfitIcon } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [form, setForm] = useState({});
  const [measurementTitle, setMeasurementTitle] = useState('');
  const [existingArray, setExistingArray] = useState([]);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  const measurementId = useLocalSearchParams().measurementId;

  useEffect(() => {
    fetchExistingMeasurements();
  }, [customerId]);

  const fetchExistingMeasurements = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
      const custData = response.data.customer;
      let arr = custData?.measurements?.[outfitName] || [];
      if (!Array.isArray(arr)) {
        arr = Object.keys(arr).length > 0 ? [{ id: 'legacy', title: 'Measurement 1', date: new Date().toISOString(), details: arr }] : [];
      }
      setExistingArray(arr);
      
      if (measurementId) {
        const itemToEdit = arr.find(item => item.id === measurementId);
        if (itemToEdit) {
           setMeasurementTitle(itemToEdit.title);
           setForm(itemToEdit.details || {});
        }
      } else {
        setMeasurementTitle(`Measurement ${arr.length + 1}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setReferenceImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newItem = {
        id: measurementId || Date.now().toString(),
        title: measurementTitle || 'Measurement',
        date: new Date().toISOString(),
        details: form
      };

      let updatedArray = [...existingArray];
      if (measurementId) {
         updatedArray = updatedArray.map(item => item.id === measurementId ? newItem : item);
      } else {
         updatedArray.push(newItem);
      }

      await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${customerId}/measurements`, {
        outfitName,
        measurements: updatedArray
      });
      
      setSuccessModal({ visible: true, message: 'Measurements saved successfully!' });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save measurements");
    } finally {
      setSaving(false);
    }
  };

  const getFieldsForOutfit = (name) => {
    const safeName = name || '';
    if (safeName.includes('Pant')) return OUTFIT_FIELDS_MAP['Pant'];
    if (safeName.includes('Blouse')) return OUTFIT_FIELDS_MAP['Blouse'];
    if (safeName.includes('Kurti') || safeName.includes('Chudidhar')) return OUTFIT_FIELDS_MAP['Chudidhar'];
    return OUTFIT_FIELDS_MAP['Default'];
  };

  const fields = getFieldsForOutfit(outfitName);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{flex: 1}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Measurement</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.titleRow}>
            <Text style={styles.iconTitle}>{outfitIcon}</Text>
            <Text style={styles.outfitTitle}>{outfitName} Measurements</Text>
          </View>

          {/* Image Upload Section */}
          <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
            {referenceImage ? (
              <Image source={{ uri: referenceImage }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <UploadCloud size={32} color={Colors.primary} style={{marginBottom: 8}} />
                <Text style={styles.uploadText}>Upload Measurement Photo</Text>
                <Text style={styles.uploadSubText}>(Optional reference)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Measurement Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Fill Measurement Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Measurement 1"
                value={measurementTitle}
                onChangeText={setMeasurementTitle}
                placeholderTextColor="#999"
              />
            </View>
            
            {fields.map((field, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{index + 1}. {field}</Text>
                {field === 'Fitting' ? (
                  <View style={styles.fittingRow}>
                    {['Tight', 'Normal', 'Loose'].map(option => (
                      <TouchableOpacity 
                        key={option}
                        style={[styles.fittingBtn, form[field] === option && styles.fittingBtnActive]}
                        onPress={() => setForm(prev => ({...prev, [field]: option}))}
                      >
                        <Text style={[styles.fittingBtnText, form[field] === option && styles.fittingBtnTextActive]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder={field === 'Model' ? 'Enter model' : '0.00'}
                    value={form[field] || ''}
                    onChangeText={(val) => setForm(prev => ({...prev, [field]: val}))}
                    keyboardType={field === 'Model' ? 'default' : 'numeric'}
                    placeholderTextColor="#999"
                  />
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, saving && {opacity: 0.7}]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Save Measurements</Text>
                <Check size={20} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
          
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
    marginTop: 50,
    marginBottom: 20
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  iconTitle: { fontSize: 28, marginRight: 12 },
  outfitTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },

  imageUploadBox: { 
    height: 160, 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius.lg, 
    borderWidth: 1.5, 
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden'
  },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  uploadSubText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  formCard: { backgroundColor: Colors.white, padding: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadows.sm, marginBottom: Spacing.xl },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.lg },
  
  inputGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  input: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: '#EEE' },

  fittingRow: { flex: 2, flexDirection: 'row', gap: 6 },
  fittingBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: '#EEE' },
  fittingBtnActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  fittingBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  fittingBtnTextActive: { color: Colors.primary },

  saveBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: BorderRadius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveBtnText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' }
});
