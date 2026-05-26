import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { XCircle } from 'lucide-react-native';
import { Colors, Spacing, Shadows } from '../constants/theme';

export default function ErrorModal({ visible, title, message, onDone }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <XCircle size={50} color={Colors.white} />
          </View>
          <Text style={styles.title}>{title || 'Error!'}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onDone}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.white, borderRadius: 30, padding: Spacing.xl, width: '85%', alignItems: 'center', ...Shadows.lg },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.error || '#f44336', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, ...Shadows.sm },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center', lineHeight: 22 },
  button: { width: '100%', height: 56, backgroundColor: Colors.error || '#f44336', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' }
});
