import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Save, Mic, Plus, Minus, Square, Play, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import axios from 'axios';
import { API_ENDPOINTS } from '../../constants/ApiConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import SuccessModal from '../../components/SuccessModal';

export default function OrderDetails() {
  const router = useRouter();
  const { customerId, category, dressType } = useLocalSearchParams();
  
  const [measurements, setMeasurements] = useState({});
  const [orderInfo, setOrderInfo] = useState({ 
    type: 'Stitching', // Stitching or Alteration
    specialInstructions: '',
    deliveryDate: '', 
    trialDate: '',
    priority: 'Normal', 
    isAariWork: false,
    quantity: 1,
    stitchingPrice: '',
    advancePaid: ''
  });
  
  const [refImage, setRefImage] = useState(null);
  const [sampleDressImage, setSampleDressImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [existingMeasurements, setExistingMeasurements] = useState(null);
  const [useExisting, setUseExisting] = useState(false);
  const [datePickerConfig, setDatePickerConfig] = useState({ show: false, target: null, date: new Date() });
  const [staffList, setStaffList] = useState([]);
  const [assignedTo, setAssignedTo] = useState({ cuttingMaster: null, stitchingMaster: null });
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });

  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    return sound ? () => {
      sound.unloadAsync();
    } : undefined;
  }, [sound]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      } else {
        Alert.alert('Permission Denied', 'Please grant microphone permissions to record audio.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  }

  async function stopRecording() {
    try {
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setAudioUri(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

    async function playAudio() {
      try {
        if (sound) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            return;
          } else {
            await sound.playAsync();
            setIsPlaying(true);
            return;
          }
        }
  
        if (isAudioLoading) return;
        setIsAudioLoading(true);
  
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
        setIsAudioLoading(false);
  
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setAudioPosition(status.positionMillis || 0);
            setAudioDuration(status.durationMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setAudioPosition(0);
              newSound.pauseAsync().then(() => {
                newSound.setPositionAsync(0);
              });
            }
          }
        });
    } catch (err) {
      console.error('Failed to play audio', err);
    }
  }

  function deleteAudio() {
    if (sound) sound.unloadAsync();
    setAudioUri(null);
    setSound(null);
    setIsPlaying(false);
      setAudioPosition(0);
      setAudioDuration(0);
    }

    useEffect(() => {
      if (customerId) fetchCustomerMeasurements();
      fetchStaff();
    }, [customerId]);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.STAFF);
      setStaffList(res.data);
    } catch (err) {
      console.log('Failed to fetch staff', err);
    }
  };

  const fetchCustomerMeasurements = async () => {
    try {
      const res = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
      const cust = res.data.customer;
      if (cust?.measurements && cust.measurements[dressType]) {
        const outfitData = cust.measurements[dressType];
        let actualMeasurements = null;
        if (Array.isArray(outfitData) && outfitData.length > 0) {
          actualMeasurements = outfitData[0].details; 
        } else if (!Array.isArray(outfitData) && Object.keys(outfitData).length > 0) {
          actualMeasurements = outfitData;
        }

        if (actualMeasurements) {
          setExistingMeasurements(actualMeasurements);
          setMeasurements(actualMeasurements);
          setUseExisting(true);
        }
      }
    } catch (error) {
      console.log('Error fetching customer measurements', error);
    }
  };

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'ref') setRefImage(result.assets[0]);
      else setSampleDressImage(result.assets[0]);
    }
  };

  const calculateTotal = () => {
    const qty = parseInt(orderInfo.quantity) || 1;
    const price = parseFloat(orderInfo.stitchingPrice) || 0;
    return qty * price;
  };

  const calculateBalance = () => {
    const total = calculateTotal();
    const advance = parseFloat(orderInfo.advancePaid) || 0;
    return Math.max(total - advance, 0);
  };

  const handleSubmit = async () => {
    if (!orderInfo.deliveryDate) {
      Alert.alert('Missing Info', 'Please provide a Delivery Date');
      return;
    }

    const parsedDeliveryDate = new Date(orderInfo.deliveryDate);
    if (isNaN(parsedDeliveryDate.getTime())) {
      Alert.alert('Invalid Date', 'Please provide a valid Delivery Date (YYYY-MM-DD)');
      return;
    }

    let parsedTrialDate = null;
    if (orderInfo.trialDate) {
      parsedTrialDate = new Date(orderInfo.trialDate);
      if (isNaN(parsedTrialDate.getTime())) {
        Alert.alert('Invalid Date', 'Please provide a valid Trial Date (YYYY-MM-DD)');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('customerId', customerId);
      formData.append('category', category);
      formData.append('dressType', dressType);
      formData.append('type', orderInfo.type);
      formData.append('specialInstructions', orderInfo.specialInstructions);
      formData.append('deliveryDate', parsedDeliveryDate.toISOString());
      
      if (parsedTrialDate) {
        formData.append('trialDate', parsedTrialDate.toISOString());
      }
      
      formData.append('priority', orderInfo.priority);
      formData.append('isAariWork', String(orderInfo.isAariWork));
      formData.append('quantity', orderInfo.quantity.toString());
      formData.append('stitchingPrice', orderInfo.stitchingPrice || '0');
      
      formData.append('measurements', JSON.stringify({ ...measurements, dressType }));
      if (assignedTo.cuttingMaster || assignedTo.stitchingMaster) {
        formData.append('assignedTo', JSON.stringify(assignedTo));
      }
      
      formData.append('billing', JSON.stringify({
        estimatedCost: calculateTotal(),
        advancePaid: Number(orderInfo.advancePaid || 0)
      }));

      if (refImage) {
        formData.append('referenceImage', {
          uri: refImage.uri,
          type: 'image/jpeg',
          name: 'ref_image.jpg',
        });
      }

      if (sampleDressImage) {
        formData.append('sampleDressPhoto', {
          uri: sampleDressImage.uri,
          type: 'image/jpeg',
          name: 'sample_dress.jpg',
        });
      }

      if (audioUri) {
        const uriParts = audioUri.split('.');
        const fileType = uriParts[uriParts.length - 1]; // e.g. "m4a", "caf", "3gp", "mp4"
        formData.append('audioInstruction', {
          uri: audioUri,
          type: `audio/${fileType}`,
          name: `audio_instruction.${fileType}`,
        });
      }

      await axios.post(API_ENDPOINTS.ORDERS, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!useExisting && Object.keys(measurements).length > 0) {
        try {
          const res = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${customerId}`);
          const cust = res.data.customer;
          let currentArray = cust?.measurements?.[dressType] || [];
          if (!Array.isArray(currentArray)) {
            currentArray = Object.keys(currentArray).length > 0 
              ? [{ id: Date.now().toString(), title: 'Legacy Measurement', date: new Date().toISOString(), details: currentArray }]
              : [];
          }
          
          currentArray.unshift({
            id: Date.now().toString(),
            title: `Order Measurement`,
            date: new Date().toISOString(),
            details: measurements
          });

          await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${customerId}/measurements`, {
            outfitName: dressType,
            measurements: currentArray
          });
        } catch (err) {
          console.log('Failed to update customer measurements', err);
        }
      }

      setSuccessModal({ visible: true, message: 'Order created successfully!' });
    } catch (error) {
      console.error('Submit Error:', error.response?.data || error.message || error);
      const errMsg = error.response?.data?.message || error.message || 'Failed to create order';
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (increment) => {
    const current = orderInfo.quantity;
    if (increment) setOrderInfo({ ...orderInfo, quantity: current + 1 });
    else if (current > 1) setOrderInfo({ ...orderInfo, quantity: current - 1 });
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
       setDatePickerConfig(prev => ({ ...prev, show: false }));
    }
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setOrderInfo(prev => ({ ...prev, [datePickerConfig.target]: formattedDate }));
      setDatePickerConfig(prev => ({ ...prev, date: selectedDate, show: Platform.OS === 'ios' }));
    }
  };

  const renderMeasurementFields = () => {
    let fields = [];
    if (dressType.toLowerCase().includes('pant') || dressType.toLowerCase().includes('skirt') || dressType.toLowerCase().includes('pavadai')) {
      fields = ['Waist', 'Hip', 'Length', 'Inseam', 'Thigh', 'Bottom'];
    } else if (category === 'Women') {
      fields = ['Bust', 'Waist', 'Hip', 'Shoulder', 'Front Neck', 'Back Neck', 'Sleeve Length', 'Armhole', 'Full Length'];
    } else if (category === 'Men') {
      fields = ['Chest', 'Waist', 'Shoulder', 'Sleeve Length', 'Neck', 'Shirt Length'];
    } else {
      fields = ['Height', 'Chest', 'Waist', 'Shoulder', 'Dress Length'];
    }

    const renderGrid = () => (
      <View style={styles.grid}>
        {fields.map((f) => {
          const key = f.toLowerCase().replace(' ', '');
          return (
            <View key={f} style={styles.gridItem}>
              <Text style={styles.inputLabel}>{f}</Text>
              <TextInput
                style={styles.gridInput}
                placeholder="0.0"
                keyboardType="numeric"
                value={measurements[key] || ''}
                onChangeText={(val) => setMeasurements({ ...measurements, [key]: val })}
                placeholderTextColor="#999"
              />
            </View>
          );
        })}
      </View>
    );

    if (existingMeasurements) {
      return (
        <View>
          <View style={[styles.row, styles.alignCenter, {marginBottom: Spacing.md}]}>
            <Text style={{fontWeight: '600', color: Colors.text}}>Use existing measurements</Text>
            <Switch 
              trackColor={{ false: '#767577', true: Colors.primary + '80' }}
              thumbColor={useExisting ? Colors.primary : '#f4f3f4'}
              value={useExisting} 
              onValueChange={(val) => {
                setUseExisting(val);
                if (val) setMeasurements(existingMeasurements);
                else setMeasurements({});
              }} 
            />
          </View>
          {useExisting ? (
            <View style={styles.measureGrid}>
              {Object.entries(existingMeasurements).map(([k, v]) => (
                <View key={k} style={styles.measureItem}>
                  <Text style={styles.measureLabel}>{k.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  <Text style={styles.measureValue}>{v}</Text>
                </View>
              ))}
            </View>
          ) : renderGrid()}
        </View>
      );
    }

    return renderGrid();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Order</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header Info */}
          <View style={[styles.section, {flexDirection: 'row', alignItems: 'center'}]}>
            <View style={{flex: 1}}>
               <Text style={{fontSize: 16, fontWeight: 'bold', color: Colors.text}}>{dressType}</Text>
            </View>
          </View>

          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type</Text>
            <View style={{flexDirection: 'row', gap: 20, marginTop: Spacing.sm}}>
              <TouchableOpacity style={styles.radioRow} onPress={() => setOrderInfo({...orderInfo, type: 'Stitching'})}>
                <View style={[styles.radioCircle, orderInfo.type === 'Stitching' && styles.radioCircleActive]} />
                <Text style={styles.radioText}>Stitching</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioRow} onPress={() => setOrderInfo({...orderInfo, type: 'Alteration'})}>
                <View style={[styles.radioCircle, orderInfo.type === 'Alteration' && styles.radioCircleActive]} />
                <Text style={styles.radioText}>Alteration</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Measurements - Only show if Stitching */}
          {orderInfo.type === 'Stitching' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Measurements</Text>
              {renderMeasurementFields()}
            </View>
          )}

          {/* Special Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <TextInput 
              style={styles.textArea} 
              placeholder="Write Instruction" 
              multiline 
              numberOfLines={4}
              value={orderInfo.specialInstructions}
              onChangeText={(v) => setOrderInfo({...orderInfo, specialInstructions: v})}
              placeholderTextColor="#999"
            />
            {audioUri ? (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 15, padding: 10, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: '#eee'}}>
                <TouchableOpacity onPress={playAudio} style={{padding: 8, backgroundColor: Colors.primary+'20', borderRadius: 20}}>
                  {isPlaying ? <Square size={20} color={Colors.primary} /> : <Play size={20} color={Colors.primary} fill={Colors.primary} />}
                </TouchableOpacity>
                <View style={{flex: 1, marginHorizontal: 10}}>
                  <View style={{height: 4, backgroundColor: '#ddd', borderRadius: 2, overflow: 'hidden'}}>
                    <View style={{height: '100%', backgroundColor: Colors.primary, width: `${audioDuration > 0 ? (audioPosition / audioDuration) * 100 : 0}%`}} />
                  </View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                    <Text style={{fontSize: 10, color: Colors.textSecondary}}>{formatTime(audioPosition)}</Text>
                    <Text style={{fontSize: 10, color: Colors.textSecondary}}>{formatTime(audioDuration)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={deleteAudio} style={{padding: 8}}>
                  <Trash2 size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.audioBtn, recording && {borderColor: Colors.danger}]} onPress={recording ? stopRecording : startRecording}>
                <Mic size={18} color={recording ? Colors.danger : Colors.primary} />
                <Text style={{color: recording ? Colors.danger : Colors.primary, fontWeight: '500', marginLeft: 8}}>
                  {recording ? 'Stop Recording' : 'Record Audio'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Images</Text>
            <View style={styles.photoGrid}>
              <TouchableOpacity style={styles.photoButton} onPress={() => pickImage('ref')}>
                {refImage ? <Image source={{ uri: refImage.uri }} style={styles.previewImage} /> : (
                  <>
                    <Camera size={24} color={Colors.textSecondary} />
                    <Text style={styles.photoText}>Inspiration</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={() => pickImage('sample')}>
                {sampleDressImage ? <Image source={{ uri: sampleDressImage.uri }} style={styles.previewImage} /> : (
                  <>
                    <Camera size={24} color={Colors.textSecondary} />
                    <Text style={styles.photoText}>Sample</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            
            <Text style={styles.inputLabel}>Delivery Date</Text>
            <TouchableOpacity 
              style={[styles.input, {justifyContent: 'center', height: 48}]} 
              onPress={() => setDatePickerConfig({ show: true, target: 'deliveryDate', date: orderInfo.deliveryDate ? new Date(orderInfo.deliveryDate) : new Date() })}
            >
              <Text style={{color: orderInfo.deliveryDate ? Colors.text : Colors.textSecondary}}>
                {orderInfo.deliveryDate || 'Select Delivery Date'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.inputLabel}>Trial Date</Text>
            <TouchableOpacity 
              style={[styles.input, {justifyContent: 'center', height: 48}]} 
              onPress={() => setDatePickerConfig({ show: true, target: 'trialDate', date: orderInfo.trialDate ? new Date(orderInfo.trialDate) : new Date() })}
            >
              <Text style={{color: orderInfo.trialDate ? Colors.text : Colors.textSecondary}}>
                {orderInfo.trialDate || 'Select Trial Date'}
              </Text>
            </TouchableOpacity>

            {datePickerConfig.show && (
              <DateTimePicker
                value={datePickerConfig.date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <View style={[styles.row, styles.alignCenter, {marginTop: 8}]}>
              <Text style={{fontSize: 14, color: Colors.primary, fontWeight: '500'}}>Prioritize Order</Text>
              <Switch 
                trackColor={{ false: '#767577', true: Colors.primary + '80' }}
                thumbColor={orderInfo.priority === 'High' ? Colors.primary : '#f4f3f4'}
                value={orderInfo.priority === 'High'} 
                onValueChange={(v) => setOrderInfo({...orderInfo, priority: v ? 'High' : 'Normal'})} 
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assign Staff (Optional)</Text>
            
            <Text style={{fontWeight: '600', color: Colors.text, marginTop: 10}}>Cutting Master</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 8 }}>
              {staffList.filter(s => s.role === 'cutting_master').map(staff => (
                <TouchableOpacity 
                  key={staff._id} 
                  style={[styles.staffChip, assignedTo.cuttingMaster === staff._id && styles.staffChipActive]}
                  onPress={() => setAssignedTo(prev => ({...prev, cuttingMaster: prev.cuttingMaster === staff._id ? null : staff._id}))}
                >
                  <Text style={[styles.staffChipText, assignedTo.cuttingMaster === staff._id && styles.staffChipTextActive]}>
                    {staff.name || (staff.email ? staff.email.split('@')[0] : 'Staff')}
                  </Text>
                </TouchableOpacity>
              ))}
              {staffList.filter(s => s.role === 'cutting_master').length === 0 && <Text style={{color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4}}>No cutting master available</Text>}
            </ScrollView>

            <Text style={{fontWeight: '600', color: Colors.text, marginTop: 10}}>Stitching Master</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 8 }}>
              {staffList.filter(s => s.role === 'stitching_master').map(staff => (
                <TouchableOpacity 
                  key={staff._id} 
                  style={[styles.staffChip, assignedTo.stitchingMaster === staff._id && styles.staffChipActive]}
                  onPress={() => setAssignedTo(prev => ({...prev, stitchingMaster: prev.stitchingMaster === staff._id ? null : staff._id}))}
                >
                  <Text style={[styles.staffChipText, assignedTo.stitchingMaster === staff._id && styles.staffChipTextActive]}>
                    {staff.name || (staff.email ? staff.email.split('@')[0] : 'Staff')}
                  </Text>
                </TouchableOpacity>
              ))}
              {staffList.filter(s => s.role === 'stitching_master').length === 0 && <Text style={{color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4}}>No stitching master available</Text>}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Quantity</Text>
              <View style={styles.qtyBox}>
                <TouchableOpacity onPress={() => updateQuantity(false)}><Minus size={18} color={Colors.textSecondary}/></TouchableOpacity>
                <Text style={styles.qtyText}>{orderInfo.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(true)}><Plus size={18} color={Colors.textSecondary}/></TouchableOpacity>
              </View>
            </View>

            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Stitching Price</Text>
                <Text style={{fontSize: 10, color: Colors.textSecondary}}>(Price/Qty)</Text>
              </View>
              <TextInput 
                style={styles.priceInput} 
                placeholder="0" 
                keyboardType="numeric" 
                value={orderInfo.stitchingPrice}
                onChangeText={(v) => setOrderInfo({...orderInfo, stitchingPrice: v})}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Price Breakup */}
          <View style={[styles.section, {backgroundColor: '#F8F9FA'}]}>
            <Text style={styles.sectionTitle}>Price Breakup</Text>
            <View style={styles.breakupRow}>
              <Text style={styles.breakupText}>Stitching Price</Text>
              <Text style={styles.breakupText}>{orderInfo.quantity} × ₹ {orderInfo.stitchingPrice || 0} = ₹ {calculateTotal()}</Text>
            </View>
            <View style={[styles.breakupRow, {marginTop: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 12}]}>
              <Text style={[styles.breakupText, {fontWeight: 'bold'}]}>Total:</Text>
              <Text style={[styles.breakupText, {fontWeight: 'bold', color: Colors.primary}]}>₹ {calculateTotal()}</Text>
            </View>

            <View style={[styles.breakupRow, {marginTop: 12}]}>
              <Text style={styles.breakupText}>Advance Amount</Text>
              <TextInput 
                style={[styles.priceInput, {width: 80, height: 30}]} 
                placeholder="0" 
                keyboardType="numeric" 
                value={orderInfo.advancePaid}
                onChangeText={(v) => setOrderInfo({...orderInfo, advancePaid: v})}
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.breakupRow, {marginTop: 8}]}>
              <Text style={[styles.breakupText, {fontWeight: 'bold'}]}>Balance Due</Text>
              <Text style={[styles.breakupText, {fontWeight: 'bold', color: Colors.error}]}>₹ {calculateBalance()}</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Text style={styles.submitText}>Save Order</Text>
                <ArrowLeft style={{transform: [{rotate: '180deg'}]}} size={20} color={Colors.white} />
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
          router.dismissAll(); 
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
    marginTop: 20,
    marginBottom: 20
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: -6 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: -6 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  section: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.border, marginRight: 8 },
  radioCircleActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  radioText: { fontSize: 14, color: Colors.text },

  textArea: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.sm, height: 80, textAlignVertical: 'top', fontSize: 14 },
  audioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, marginTop: Spacing.sm },

  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md, fontSize: 14 },
  inputLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: Spacing.md },
  gridInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingVertical: 6, paddingHorizontal: 8, fontSize: 14 },
  
  photoGrid: { flexDirection: 'row', gap: Spacing.md },
  photoButton: { flex: 1, height: 100, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  previewImage: { width: '100%', height: '100%', borderRadius: BorderRadius.md },
  photoText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  
  row: { flexDirection: 'row', gap: Spacing.md },
  alignCenter: { alignItems: 'center', justifyContent: 'space-between' },

  staffChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  staffChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  staffChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  staffChipTextActive: { color: Colors.white, fontWeight: 'bold' },
  
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  priceLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  qtyBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 6 },
  qtyText: { marginHorizontal: 16, fontSize: 14, fontWeight: '600' },
  priceInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 6, width: 100, textAlign: 'center', fontSize: 14 },

  breakupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakupText: { fontSize: 13, color: Colors.text },

  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  measureItem: { width: '47%', backgroundColor: '#F8F9FA', padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: 8 },
  measureLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: 2 },
  measureValue: { fontSize: 15, fontWeight: 'bold', color: Colors.text },

  submitButton: { backgroundColor: Colors.primary, flexDirection: 'row', height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginRight: Spacing.sm },
  disabled: { opacity: 0.7 }
});
